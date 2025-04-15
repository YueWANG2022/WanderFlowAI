// netlify/functions/travel-advice.js
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const { userId, destination, duration, interests, budget } = data;

    if (!destination || !duration || !interests || !budget) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'Missing required fields: destination, duration, interests, and budget are required'
        })
      };
    }

    // Generate travel advice using OpenAI
    const prompt = `
You are a travel expert helping a traveler plan their trip to ${destination} for ${duration} days.
They are particularly interested in ${interests} and have a ${budget} budget level.

Please provide detailed travel advice including:
1. Best areas to stay in ${destination}
2. Top 5 must-see attractions or activities related to ${interests}
3. Transportation recommendations within ${destination}
4. Budget tips that match their ${budget} level
5. Local cuisine recommendations
6. Safety tips specific to ${destination}
7. Recommended day-by-day itinerary for ${duration} days

Format your response in a clear, organized way with headings and brief explanations.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable travel advisor who provides personalized, practical travel advice"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const advice = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        advice: advice
      })
    };

  } catch (error) {
    console.error('Error generating travel advice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'An error occurred while generating travel advice'
      })
    };
  }
};