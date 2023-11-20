const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
//const { Configuration, OpenAIApi } = require('openai');
const { OpenAI } = require('openai');

const langdetect = require('langdetect');
const translate = require('google-translate-api');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const axios = require('axios');
const textToSpeech = require('node-gtts')('en');
// My own code
const { parseMessages, fragmentDataByDate, fragmentDataByTime } = require('./public/js/messageParser');
const { promisify } = require('util');

require('dotenv').config(); // Load environment variables from .env file

/*

// Google Analytics
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID;
// Amazon Affiliate
const amazonAffiliateId = process.env.AMAZON_AFFILIATE_ID;
// Google AdSense
const googleAdSenseId = process.env.GOOGLE_ADSENSE_ID;


*/

const app = express();
const port = process.env.PORT || 3000;
// Initialize OpenAI API
const openai_client = new OpenAI({
    apiKey: process.env["API_KEY_OPENAI"]
});

// Configure public directory to serve Bootstrap CSS
app.use(express.static(path.join(__dirname, 'public')));

// Set up the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Define a Route for the Root URL:
app.get('/', (req, res) => {
    // Render your main page (e.g., 'index.ejs')
    res.render('index', { bootstrap: true });
  });

app.get('/upload', (req, res) => {
  res.render('upload', { bootstrap: true });
});

// Define a route to handle the GET request to '/result'
app.get('/result', (req, res) => {
  // Render the 'result' page
  res.render('result', { generatedText: 'Your generated text goes here' });
});


// Define a route to handle the chat completion result
app.post('/result', (req, res) => {
  // Assume you have the generated text available in the variable 'generatedText'
  const generatedText = "Your generated text goes here"; // Replace this with the actual data

  // Render the 'result' page with the generated text
  res.render('result', { generatedText });
});

app.post('/upload', upload.single('textfile'), async (req, res) => {
  // Read the uploaded text file
  const filePath = path.join(__dirname, 'public/uploads', req.file.originalname);

  if (fs.existsSync(filePath)) {
    // Read the uploaded text file
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Continue with the rest of your processing logic
    // Detect the language of the text
    const detectedLanguage = langdetect.detect(fileContent);
    console.log(`Detected Language: ${JSON.stringify(detectedLanguage)}`);

    // Define a prompt tailored for language learning context
    //const prompt = `In a ${detectedLanguage} language learning lesson, the student and teacher discussed:\n${fileContent}\n\nStudent's Reflection:\n`;
    console.log(`FileContent is: ${JSON.stringify(fileContent)}`);

    const fragments = fragmentDataByTime(fileContent);
    console.log(fragments);
    console.log("The length of Fragments = ", fragments.length);
    console.log(`\n-> THE FRAGMENTS ARE: ${JSON.stringify(fragments)}` );

    
    /*
    const conversation = parseMessages(fileContent);
    console.log(`\n-> Conversation text is: ${JSON.stringify(conversation)}` );
    fs.writeFileSync('conversation.txt', JSON.stringify(conversation), 'utf-8');
    */

    // Combine phrases into a single string with line breaks
    const conversation = fragments.join('\n');
    const prompt = `In a Russian language learning lesson, the student and teacher discussed:\n${conversation}\n\nStudent's Reflection:\n`;

    // Process the text with OpenAI's GPT-3
    //const chatCompletionResult = await new Promise((resolve, reject) => {
        const chatCompletion  = await openai_client.chat.completions.create(
        ////// NEW //////
        // New
        /*
        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{"role": "user", "content": "Hello!"}],
            stream: true,
        });
        for await (const part of stream) {
            console.log(part.choices[0].delta);
        } */
        /////////////////
          {
            model: 'gpt-3.5-turbo',
            //prompt: prompt,
            messages: [
              { role: 'system', content: 'You are a helpful teacher assistant expert in Russian Language.' },
              { role: 'user', content: 'Translate the following Russian text to English:' },
              { role: 'assistant', content: prompt },
            ],
            max_tokens: 100,
          },
          
          (error, response) => {
            
            if (error) {
              console.error('OpenAI Error:', error);
              reject(error);
            } else {
              console.log("INSIDE resolve(response)");
              console.log("RESPONSE = ", response);
              resolve(response);
            }
          }
        );

      //const generatedText = chatCompletion.choices[0].text;
      const generatedText = chatCompletion.choices[0].message;
      console.log("Generated Words = ", generatedText);
      
  } else {
    console.error('File does not exist:', filePath);
    res.status(404).send('The uploaded file does not exist.');
  }
  //res.redirect('/result');
  // Extract generated text from the GPT-3 response
  const generatedText = chatCompletion.choices[0].message;
  console.log("Generated Words = ", generatedText);

  // Fetch word explanations
  const tokens = tokenizer.tokenize(generatedText);
  const wordExplanations = await fetchWordExplanations(tokens);

  // Translate words to English and Spanish
  const wordTranslations = await translateWordsToEnglishAndSpanish(tokens);

  // Render the 'result' page with generated text, word explanations, and translations
  res.render('result', { generatedText, wordExplanations, wordTranslations });
});

app.post('/makeText', upload.single('textfile'), async (req, res) => {
    // Read the uploaded text file
    const filePath = path.join(__dirname, 'public/uploads', req.file.originalname);
  
    if (fs.existsSync(filePath)) {
      // Read the uploaded text file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
  
      // Continue with the rest of your processing logic
      // Detect the language of the text
      const detectedLanguage = langdetect.detect(fileContent);
      console.log(`Detected Language: ${JSON.stringify(detectedLanguage)}`);
  
      // Define a prompt tailored for language learning context
      //const prompt = `In a ${detectedLanguage} language learning lesson, the student and teacher discussed:\n${fileContent}\n\nStudent's Reflection:\n`;
      console.log(`FileContent is: ${JSON.stringify(fileContent)}`);
  
      const fragments = fragmentDataByTime(fileContent);
      console.log(fragments);
      console.log("The length of Fragments = ", fragments.length);
      console.log(`\n-> THE FRAGMENTS ARE: ${JSON.stringify(fragments)}` );
  
      
      /*
      const conversation = parseMessages(fileContent);
      console.log(`\n-> Conversation text is: ${JSON.stringify(conversation)}` );
      fs.writeFileSync('conversation.txt', JSON.stringify(conversation), 'utf-8');
      */
  
      // Combine phrases into a single string with line breaks
      const conversation = fragments.join('\n');
      //prompt = `Compose a short easy text, In Russian language, using the next words:\n${conversation}\n\nText for Student:\n`;
  
      // Process the text with OpenAI's GPT-3
      //const chatCompletionResult = await new Promise((resolve, reject) => {
          const chatCompletion  = await openai_client.chat.completions.create(
          ////// NEW //////
          // New
          /*
          const stream = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [{"role": "user", "content": "Hello!"}],
              stream: true,
          });
          for await (const part of stream) {
              console.log(part.choices[0].delta);
          } */
          /////////////////
            {
              model: 'gpt-3.5-turbo',
              //prompt: prompt,
              messages: [
                { role: 'system', content: 'You are a helpful teacher assistant expert in Russian Language.' },
                { role: 'user', content: `Create an easy text in Russian for students using the following words: ${conversation}` },
                { role: 'assistant', content: '' }, // Leave content empty to let the model generate the assistant's response
              ],
              max_tokens: 100,
            },
            
            (error, response) => {
              
              if (error) {
                console.error('OpenAI Error:', error);
                reject(error);
              } else {
                console.log("INSIDE resolve(response)");
                console.log("RESPONSE = ", response);
                resolve(response);
              }
            }
          );
  
        //const generatedText = chatCompletion.choices[0].text;
        const generatedText = chatCompletion.choices[0].message;
        console.log("Generated Text = ", generatedText);
  
    } else {
      console.error('File does not exist:', filePath);
      res.status(404).send('The uploaded file does not exist.');
    }
    res.redirect('/result');
  });




// Function to fetch word explanations using WordsAPI
async function fetchWordExplanations(tokens, language) {
  const explanations = [];
  for (const token of tokens) {
    // Adjust this logic to fetch word explanations as per your requirements
    // Here, we assume WordsAPI is used to get word definitions
    const apiUrl = `https://wordsapiv1.p.rapidapi.com/words/${token}`;
    const headers = {
      'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
      'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY', // Replace with your API key
    };
    try {
      const response = await axios.get(apiUrl, { headers });
      if (response.data.results && response.data.results.length > 0) {
        const definition = response.data.results[0].definition;
        explanations.push(`${token} - ${definition}`);
      }
    } catch (error) {
      console.error(`Error fetching explanation for ${token}: ${error}`);
    }
  }
  return explanations;
}

// Function to translate words to both English and Spanish
async function translateWordsToEnglishAndSpanish(tokens) {
    const translations = {};
    for (const token of tokens) {
        const englishTranslation = await translate(token, { to: 'en' });
        const spanishTranslation = await translate(token, { to: 'es' });
        translations[token] = {
        english: englishTranslation.text,
        spanish: spanishTranslation.text,
        };
    }
    return translations;
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

app.post('/subscribe', (req, res) => {
const email = req.body.email;
// Process the email (e.g., send a confirmation email or store in a database)
// Implement this part based on your specific requirements.
// Ensure you have the necessary packages installed for handling email or database operations.
res.redirect('/'); // Redirect back to the main page
});
  