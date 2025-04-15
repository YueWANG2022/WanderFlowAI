// netlify/functions/match-users/match-users.js
const { OpenAI } = require('openai');
const fetch = require('node-fetch');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const DATA_PATH = 'data/users'; // Path in your GitHub repo where user data is stored

// Weights for different criteria (same as in Python code)
const WEIGHTS = [0.0, 0.2, 0.1, 0.3, 0.1, 0.3, 0.3, 0.1, 0.3, 0.1, 0.1, 0.1];

// Function to get data from GitHub
async function getFromGitHub(path) {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Content is Base64 encoded
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return {
      content: JSON.parse(content),
      sha: data.sha // We need the SHA for updates
    };
  } catch (error) {
    console.error(`Error fetching from GitHub: ${error.message}`);
    return null;
  }
}

// Function to save data to GitHub
async function saveToGitHub(path, content, sha = null) {
  try {
    const payload = {
      message: `Update ${path}`,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      branch: 'main' // or your default branch
    };

    // If we're updating an existing file, we need the SHA
    if (sha) {
      payload.sha = sha;
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${response.status} ${error.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error saving to GitHub: ${error.message}`);
    return null;
  }
}

// Cosine similarity function
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Function to get top matches
function getTopMatches(similarityMatrix, weights, topK = 3) {
  const weightedScores = similarityMatrix.map(row => {
    return row.reduce((sum, score, i) => sum + score * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  });

  // Create array of [index, score] pairs and sort
  const indexedScores = weightedScores.map((score, i) => [i, score]);
  indexedScores.sort((a, b) => b[1] - a[1]);

  // Return top K matches
  return indexedScores.slice(0, topK);
}

exports.handler = async (event, context) => {
  try {
    // Only allow POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ status: 'error', message: 'Method Not Allowed' })
      };
    }

    // Parse the request body
    const data = JSON.parse(event.body);
    const userId = data.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'User ID is required'
        })
      };
    }

    // Get the user's data from GitHub
    const userDataFile = await getFromGitHub(`${DATA_PATH}/${userId}.json`);
    let userData;

    if (!userDataFile) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: 'error',
          message: 'User not found'
        })
      };
    }

    userData = userDataFile.content;

    // Get user embeddings
    const userEmbeddings = userData.embeddings || [];

    if (userEmbeddings.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'User has no embeddings'
        })
      };
    }

    // Get the directory listing of all users
    const dirResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!dirResponse.ok) {
      throw new Error(`GitHub API error: ${dirResponse.status} ${dirResponse.statusText}`);
    }

    const dirListing = await dirResponse.json();

    // Filter out the current user and get all other users' data
    const otherUserFiles = dirListing.filter(file =>
      file.type === 'file' &&
      file.name.endsWith('.json') &&
      file.name !== `${userId}.json`
    );

    // Fetch all other users' data
    const allUsersPromises = otherUserFiles.map(file => getFromGitHub(`${DATA_PATH}/${file.name}`));
    const allUsersResults = await Promise.all(allUsersPromises);
    const allUsers = allUsersResults
      .filter(result => result !== null)
      .map(result => result.content);

    // Calculate similarity matrix
    const similarityMatrix = [];
    const userDataArray = [];

    for (const user of allUsers) {
      const userEmbed = user.embeddings || [];

      // Skip users without embeddings
      if (userEmbed.length === 0) continue;

      // Calculate similarities for each field
      const rowSimilarities = [];
      for (let i = 0; i < Math.min(userEmbeddings.length, userEmbed.length); i++) {
        rowSimilarities.push(cosineSimilarity(userEmbeddings[i], userEmbed[i]));
      }

      similarityMatrix.push(rowSimilarities);
      userDataArray.push(user);
    }

    // Get top matches
    const topMatchIndices = getTopMatches(similarityMatrix, WEIGHTS, 3);

    // Format matches for response
    const matches = topMatchIndices.map(([index, similarity]) => {
      const matchData = userDataArray[index];
      return {
        userId: matchData.userId,
        name: matchData.real_name || 'Anonymous Traveler',
        age_group: matchData.age_group || '25--34',
        nationality: matchData.nationality || 'International',
        preferred_residence: matchData.preferred_residence || 'Anywhere',
        interests: matchData.interests || 'Various activities',
        similarity: similarity
      };
    });

    // Save the match results to GitHub for future reference
    const matchesPath = `${DATA_PATH}/matches/${userId}.json`;
    const matchesData = {
      userId: userId,
      timestamp: new Date().toISOString(),
      matches: matches
    };

    await saveToGitHub(matchesPath, matchesData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        matches: matches
      })
    };

  } catch (error) {
    console.error('Error in match-users function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'An error occurred while finding matches: ' + error.message
      })
    };
  }
};