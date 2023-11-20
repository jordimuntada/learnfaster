const fs = require('fs');

function cleanText(text) {
    // Regular expression to match dates in the format "HH:MM" and non-Russian words
    const datePattern = /\b\d{1,2}:\d{2}\b/g;
    const nonRussianWordPattern = /[^а-яА-Я\n]+/g; // Match any characters that are not Russian letters or newline
  
    // Replace dates and non-Russian words with empty strings
    const cleanedText = text.replace(datePattern, '').replace(nonRussianWordPattern, '');
  
    // Remove extra newline characters
    return cleanedText.replace(/\n+/g, '\n').trim();
  }
  
function fragmentDataByDate(text) {
    const messages = text.split(/\r\n/).filter(message => message.trim() !== '');
    const fragments = [];
    let currentFragment = '';
  
    for (const message of messages) {
        console.log("-> MESSAGE = ", message)
      if (message.match(/^\d{1,2}:\d{2}$/)) {
        // If the message starts with a timestamp (e.g., "18:05"), it's a new fragment.
        // Push the currentFragment to the fragments array and start a new one.
        if (currentFragment) {
          fragments.push(currentFragment);
        }
        currentFragment = message;
      } else {
        // Append the message to the current fragment.
        currentFragment += `\n${message}`;
      }
    }
}

function extractRussianWords(text) {
    const words = text.split(/\s+/); // Split the text into words
    const russianWords = [];
  
    // Helper function to check if a word contains Russian characters
    const isRussian = (word) => /[а-яА-ЯёЁ]/.test(word);
  
    for (const word of words) {
      if (isRussian(word)) {
        russianWords.push(word);
      }
    }
  
    return russianWords;
  }
/**
 * Splits a text containing messages into fragments based on the time of day.
 * Messages that do not contain Russian characters are excluded from the fragments.
 *
 * @param {string} text - The input text containing messages.
 * @returns {Array} An array of fragments, each containing a timestamp and associated messages.
 */
function fragmentDataByTime(text) {
    // Split the text into individual messages and filter out empty lines
    const messages = text.split(/\r\n/).filter(message => message.trim() !== '');
    const fragments = [];
    const WordsInRussian = [];
    let currentTime = '';
  
    // Helper function to check if a text contains Russian characters
    const isRussian = (text) => /[а-яА-ЯёЁ]/.test(text);
    // Helper function to check if a string is a valid time or timestamp (HH:mm format)
    const isTimeOrTimestamp = (text) => {
        // Regular expression to match the HH:mm time format (e.g., "18:05")
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex.test(text);
    };
  
    for (const message of messages) {
      // If the message starts with a timestamp (e.g., "18:05"), it's a new fragment.
      // Push the currentFragment to the fragments array and start a new one.
      if (message.match(/^\d{1,2}:\d{2}$/)) {
        if (currentTime) {
          console.log("currentTime words = ", currentTime)
          console.log("---> extractRussianWords(currentTime) :", extractRussianWords(currentTime));
          WordsInRussian.push(extractRussianWords(currentTime));
          console.log("---> WordsInRussian", WordsInRussian);
          fragments.push(currentTime);
        }
        currentTime = message;
      } else if (isRussian(message)) {
        // Append the message to the current fragment only if it contains Russian characters.
        console.log("Appending words = ", message)
        WordsInRussian.push(message)
        currentTime += `\n${message}`;
      }
    }
  
    // Push the last fragment to the array.
    if (currentTime) {
      fragments.push(currentTime);
    }
    //const allRussianWords = extractRussianWords(fragments);
    //console.log("=====> ALL RUSSIAN WORDS = ", allRussianWords)
    
    const new_fragments = removeTimeEntries(removeTimesAndFlatten(flattenArray(WordsInRussian)));
    return new_fragments;
  }

  function removeTimeEntries(inputArray) {
    return inputArray.filter(item => typeof item !== 'string' || !/^\d{1,2}:\d{2}$/.test(item));
  }

  function removeTimesAndFlatten(inputArray) {
    const result = [];
  
    for (const item of inputArray) {
      if (typeof item === 'string' && /^\d{1,2}:\d{2}$/.test(item)) {
        // Skip items that match the time format (e.g., "18:05")
        continue;
      }
  
      if (Array.isArray(item)) {
        // Recursively process nested arrays
        result.push(...removeTimesAndFlatten(item));
      } else {
        // Add non-time items to the result array
        result.push(item);
      }
    }
  
    return result;
  }

  function flattenArray(arr) {
    const result = [];
  
    function recursiveFlatten(array) {
      for (const element of array) {
        if (Array.isArray(element)) {
          recursiveFlatten(element);
        } else {
          result.push(element);
        }
      }
    }
  
    recursiveFlatten(arr);
    return result;
  }


// messageParser.js
function parseMessages(text) {
    const messages = text.split(/\r\n/).filter(message => message.trim() !== '');

  const conversation = [];
  let currentSender = null;

  for (const message of messages) {
    if (message.startsWith("Anna,")) {
      currentSender = "Anna";
      const content = message.substr(6).trim();

      // Clean content from dates and non-Russian words
      //const cleanedContent = cleanText(content);

      //conversation.push({ sender: currentSender, content: cleanedContent });
      conversation.push({ sender: currentSender});
      
    } else {
      if (currentSender) {
        conversation[conversation.length - 1].content += `\n${message}`;
      }
    }
  }
  
    return conversation;
  }
  
  module.exports = { parseMessages, fragmentDataByDate, fragmentDataByTime };