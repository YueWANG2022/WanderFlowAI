// netlify/functions/generate-blog.js
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate a blog title
async function generateBlogTitle(userInfo, partnerInfo, routeInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const originCity = userInfo.origin_city;
    const destCity = userInfo.destination_city;
    const transportMode = routeInfo.transport.mode;
    const duration = routeInfo.duration || 7;
    const travelType = partnerInfo ? "duo" : "solo";

    const prompt = `
    Create an engaging and creative title for a travel blog about a ${duration}-day journey
    from ${originCity} to ${destCity} by ${transportMode}.
    This is a ${travelType} trip.
    Make it catchy, creative, and appealing. Just return the title, nothing else.
    `;

    const result = await model.generateContent(prompt);
    let title = result.response.text().trim();

    // Clean up the title (remove quotes if present)
    title = title.replace(/^["']|["']$/g, '');

    return title;
  } catch (error) {
    console.error('Error generating blog title with Gemini:', error);

    // Fallback title
    const originCity = userInfo.origin_city;
    const destCity = userInfo.destination_city;
    const duration = routeInfo.duration || 7;

    return `${duration} Days from ${originCity} to ${destCity}: An Unforgettable Journey`;
  }
}

// Function to generate blog content with Gemini
async function generateBlogWithGemini(userInfo, partnerInfo, routeInfo, title) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const originCity = userInfo.origin_city;
    const destCity = userInfo.destination_city;
    const transportMode = routeInfo.transport.mode;
    const duration = routeInfo.duration || 7;
    const travelType = partnerInfo ? "with a travel partner" : "solo";

    // Extract some itinerary highlights for the prompt
    const itineraryHighlights = routeInfo.itinerary
      .slice(0, 3)
      .map(day => `Day ${day.day}: ${day.activities}`)
      .join(', ');

    const prompt = `
    Write a detailed travel blog post titled "${title}" about a ${duration}-day journey from ${originCity} to ${destCity} by ${transportMode}.

    This is a ${travelType} trip ${partnerInfo ? `with someone who enjoys ${partnerInfo.interests}` : ''}.

    Some highlights of the trip include: ${itineraryHighlights}

    Structure the blog with these sections:
    1. Introduction - Why I chose this journey
    2. Preparation and planning
    3. The journey begins
    4. Day-by-day highlights and experiences
    5. The people and culture
    6. Food experiences
    7. Challenges and how I overcame them
    8. Reflection and what I learned

    Make it personal, immersive, and descriptive with sensory details. Write in first person.
    Include practical tips for others who might want to take a similar journey.
    `;

    const result = await model.generateContent(prompt);
    const blogContent = result.response.text();

    return {
      title: title,
      content: blogContent,
      generated_by: "gemini"
    };
  } catch (error) {
    console.error('Error generating blog with Gemini:', error);
    return null;
  }
}

// Function to generate blog content with OpenAI
async function generateBlogWithOpenAI(userInfo, partnerInfo, routeInfo, title) {
  try {
    const originCity = userInfo.origin_city;
    const destCity = userInfo.destination_city;
    const transportMode = routeInfo.transport.mode;
    const duration = routeInfo.duration || 7;
    const travelType = partnerInfo ? "with a travel partner" : "solo";

    // Extract some itinerary highlights for the prompt
    const itineraryHighlights = routeInfo.itinerary
      .slice(0, 3)
      .map(day => `Day ${day.day}: ${day.activities}`)
      .join(', ');

    const prompt = `
    Write a detailed travel blog post titled "${title}" about a ${duration}-day journey from ${originCity} to ${destCity} by ${transportMode}.

    This is a ${travelType} trip ${partnerInfo ? `with someone who enjoys ${partnerInfo.interests}` : ''}.

    Some highlights of the trip include: ${itineraryHighlights}

    Structure the blog with these sections:
    1. Introduction - Why I chose this journey
    2. Preparation and planning
    3. The journey begins
    4. Day-by-day highlights and experiences
    5. The people and culture
    6. Food experiences
    7. Challenges and how I overcame them
    8. Reflection and what I learned

    Make it personal, immersive, and descriptive with sensory details. Write in first person.
    Include practical tips for others who might want to take a similar journey.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a travel blogger who writes immersive, detailed, and personal travel narratives."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2500
    });

    const blogContent = completion.choices[0].message.content;

    return {
      title: title,
      content: blogContent,
      generated_by: "openai"
    };
  } catch (error) {
    console.error('Error generating blog with OpenAI:', error);
    return null;
  }
}

// Function to generate a simple blog with template
function generateBlogWithTemplate(userInfo, partnerInfo, routeInfo, title) {
  const originCity = userInfo.origin_city;
  const destCity = userInfo.destination_city;
  const transportMode = routeInfo.transport.mode;
  const duration = routeInfo.duration || 7;
  const travelType = partnerInfo ? "with a travel partner" : "solo";

  // Format current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate simple blog content
  const blogContent = `
# ${title}

*Published on ${formattedDate}*

## Introduction

I've always wanted to visit ${destCity}, and finally the opportunity presented itself. This is the story of my ${duration}-day journey from ${originCity} to ${destCity} by ${transportMode}, traveling ${travelType}.

## The Journey Begins

The adventure started in ${originCity}, where I prepared everything needed for this trip. I was excited to explore new places and experience different cultures.

## The Itinerary

${routeInfo.itinerary.map(day => `
### Day ${day.day}
${day.activities}

We enjoyed meals at ${day.food}.

Accommodation: ${day.accommodation}

${day.travel_logistics ? `Travel notes: ${day.travel_logistics}` : ''}
`).join('\n')}

## Travel Tips

If you're planning a similar journey, here are some tips:
- Research your destination thoroughly before departure
- Pack according to the weather forecast
- Respect local customs and traditions
- Try the local cuisine
- Keep an open mind and be flexible with your plans

## Conclusion

This trip from ${originCity} to ${destCity} was truly unforgettable. Whether you're traveling alone or with companions, this route offers something for everyone.

Until the next adventure!
`;

  return {
    title: title,
    content: blogContent,
    generated_by: "template"
  };
}

// Function to convert blog content to HTML
function convertToHtml(blogData, userInfo, partnerInfo, routeInfo) {
  const title = blogData.title;
  const content = blogData.content;
  const generatedBy = blogData.generated_by;

  // Format current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Process content for HTML - convert markdown-like formatting
  let htmlContent = content
    .replace(/# (.*?)(?:\n|$)/g, '<h2>$1</h2>\n')
    .replace(/## (.*?)(?:\n|$)/g, '<h3>$1</h3>\n')
    .replace(/### (.*?)(?:\n|$)/g, '<h4>$1</h4>\n')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Ensure the content starts and ends with paragraph tags
  if (!htmlContent.startsWith('<h')) {
    htmlContent = `<p>${htmlContent}`;
  }
  if (!htmlContent.endsWith('</p>')) {
    htmlContent = `${htmlContent}</p>`;
  }

  // Create HTML template
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            font-family: 'Georgia', serif;
            line-height: 1.8;
            color: #333;
            background-color: #f8f9fa;
        }
        .blog-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .blog-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border-radius: 10px;
        }
        .blog-title {
            font-size: 2.5rem;
            margin-bottom: 20px;
            line-height: 1.3;
        }
        .blog-meta {
            font-style: italic;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        .travel-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            margin: 20px 0;
        }
        .travel-badge {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .blog-content {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .blog-content h2 {
            color: #4a00e0;
            margin-top: 30px;
            margin-bottom: 20px;
            font-size: 1.8rem;
        }
        .blog-content h3 {
            color: #5e60ce;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        .blog-content h4 {
            color: #7678ed;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.3rem;
        }
        .blog-content p {
            margin-bottom: 20px;
            text-align: justify;
        }
        .blog-content img {
            max-width: 100%;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .route-map {
            width: 100%;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .blog-footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6c757d;
            font-size: 0.9rem;
        }
        .location-tag {
            display: inline-block;
            background-color: #e9ecef;
            color: #495057;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.9rem;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        blockquote {
            border-left: 4px solid #5e60ce;
            padding-left: 20px;
            margin: 30px 0;
            font-style: italic;
            color: #495057;
        }
        @media (max-width: 768px) {
            .blog-title {
                font-size: 2rem;
            }
            .blog-content {
                padding: 25px;
            }
            .blog-header {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="blog-container">
        <div class="blog-header">
            <h1 class="blog-title">${title}</h1>
            <div class="blog-meta">Published on ${formattedDate}</div>

            <div class="travel-info">
                <div class="travel-badge">
                    <i class="bi bi-geo-alt-fill"></i> From: ${userInfo.origin_city}
                </div>
                <div class="travel-badge">
                    <i class="bi bi-geo-alt-fill"></i> To: ${userInfo.destination_city}
                </div>
                <div class="travel-badge">
                    <i class="bi bi-${routeInfo.transport.mode === 'plane' ? 'airplane' : routeInfo.transport.mode === 'train' ? 'train-front' : 'car-front'}-fill"></i> By: ${routeInfo.transport.mode}
                </div>
                <div class="travel-badge">
                    <i class="bi bi-calendar3"></i> Duration: ${routeInfo.duration} days
                </div>
            </div>
        </div>

        <div class="blog-content">
            ${htmlContent}

            ${routeInfo.map_url ? `
            <div class="text-center my-4">
                <h3>Our Journey Route</h3>
                <img src="${routeInfo.map_url}" alt="Travel Route Map" class="route-map">
            </div>
            ` : ''}
        </div>

        <div class="blog-footer">
            <p>
                <div class="location-tags mb-3">
                    <span class="location-tag"><i class="bi bi-geo-alt-fill"></i> ${userInfo.origin_city}</span>
                    <span class="location-tag"><i class="bi bi-geo-alt-fill"></i> ${userInfo.destination_city}</span>
                    <span class="location-tag"><i class="bi bi-${routeInfo.transport.mode === 'plane' ? 'airplane' : routeInfo.transport.mode === 'train' ? 'train-front' : 'car-front'}-fill"></i> ${routeInfo.transport.mode}</span>
                </div>
                Generated by WanderMatch | Travel Partner Matching Platform<br>
                <small>Content generated with ${generatedBy === 'gemini' ? 'Google Gemini' : generatedBy === 'openai' ? 'OpenAI' : 'WanderMatch template'}</small>
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return htmlTemplate;
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
    const {
      userId,
      user_info,
      partner_info,
      route_info
    } = data;

    if (!user_info || !route_info) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'User information and route information are required'
        })
      };
    }

    // Generate a blog title
    const blogTitle = await generateBlogTitle(user_info, partner_info, route_info);

    // Try to generate blog with Gemini
    let blogData = await generateBlogWithGemini(user_info, partner_info, route_info, blogTitle);

    // If Gemini fails, try OpenAI
    if (!blogData) {
      blogData = await generateBlogWithOpenAI(user_info, partner_info, route_info, blogTitle);
    }

    // If both fail, use template
    if (!blogData) {
      blogData = generateBlogWithTemplate(user_info, partner_info, route_info, blogTitle);
    }

    // Convert to HTML
    const blogHtml = convertToHtml(blogData, user_info, partner_info, route_info);

    // Create a filename for the blog
    const safeTitle = blogTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${safeTitle}_${timestamp}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        blog: {
          title: blogData.title,
          content: blogData.content,
          html: blogHtml,
          filename: filename,
          generated_by: blogData.generated_by
        }
      })
    };

  } catch (error) {
    console.error('Error generating blog:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'An error occurred while generating the travel blog: ' + error.message
      })
    };
  }
};