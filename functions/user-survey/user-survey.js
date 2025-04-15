// netlify/functions/user-survey/user-survey.js
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const DATA_PATH = 'data/users'; // Path in your GitHub repo where user data is stored

// Function to save data to GitHub
async function saveToGitHub(path, content) {
  try {
    // Check if file already exists
    let sha = null;
    try {
      const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (checkResponse.ok) {
        const fileData = await checkResponse.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, continue with creation
      console.log(`Creating new file at ${path}`);
    }

    const payload = {
      message: sha ? `Update ${path}` : `Create ${path}`,
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
    throw error;
  }
}

// Function to embed text using OpenAI API
async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      input: text,
      model: "text-embedding-ada-002"
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
}

// Default values for empty fields
const defaultValues = {
  real_name: 'Anonymous Traveler',
  age_group: '25--34',
  gender: 'Prefer not to say',
  nationality: 'International',
  preferred_residence: 'Swiss',
  cultural_symbol: 'Local cuisine',
  bucket_list: 'Nature exploration',
  healthcare_expectations: 'Basic healthcare access',
  travel_budget: '$1000',
  currency_preferences: 'Credit card',
  insurance_type: 'Medical only',
  past_insurance_issues: 'None'
};

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

    // Fill in default values for empty fields
    const surveyData = { ...defaultValues };
    Object.keys(data).forEach(key => {
      if (data[key] && data[key].trim() !== '') {
        surveyData[key] = data[key].trim();
      }
    });

    // Add a unique ID for the user if not provided
    const userId = data.userId || uuidv4();
    surveyData.userId = userId;

    // Add timestamp if not provided
    if (!surveyData.timestamp) {
      surveyData.timestamp = new Date().toISOString();
    }

    // Create embeddings for the user data
    const embeddingFields = [
      'real_name', 'age_group', 'gender', 'nationality', 'preferred_residence',
      'cultural_symbol', 'bucket_list', 'healthcare_expectations', 'travel_budget',
      'currency_preferences', 'insurance_type', 'past_insurance_issues'
    ];

    // Create an array of promises for all embeddings
    const embeddingPromises = embeddingFields.map(field =>
      embedText(surveyData[field] || defaultValues[field])
    );

    // Wait for all embeddings to complete
    const embeddings = await Promise.all(embeddingPromises);

    // Add embeddings to user data
    surveyData.embeddings = embeddings;

    // Save user data to GitHub
    const filePath = `${DATA_PATH}/${userId}.json`;
    await saveToGitHub(filePath, surveyData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Survey data received and processed successfully',
        userId: userId
      })
    };
  } catch (error) {
    console.error('Error processing survey:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'An error occurred while processing your survey: ' + error.message
      })
    };
  }
};