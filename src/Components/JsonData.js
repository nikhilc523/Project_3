/**
 * Extracts and formats relevant data from Google Cloud Vision API results
 * @param {Object} apiResults - Raw API results from Google Cloud Vision
 * @returns {Object} Formatted object containing important data points
 */
function extractImportantData(apiResults) {
  const importantData = {};

  // Extract text found in the image (OCR results)
  if (Array.isArray(apiResults.textAnnotations)) {
    importantData.textAnnotations = apiResults.textAnnotations.map(annotation => annotation.description);
  }

  // Extract facial expressions and characteristics
  if (Array.isArray(apiResults.faceAnnotations)) {
    importantData.faceAnnotations = apiResults.faceAnnotations.map(face => ({
      joyLikelihood: face.joyLikelihood ? face.joyLikelihood : 'UNKNOWN',
      sorrowLikelihood: face.sorrowLikelihood ? face.sorrowLikelihood : 'UNKNOWN',
      angerLikelihood: face.angerLikelihood ? face.angerLikelihood : 'UNKNOWN',
      surpriseLikelihood: face.surpriseLikelihood ? face.surpriseLikelihood : 'UNKNOWN',
      blurredLikelihood: face.blurredLikelihood ? face.blurredLikelihood : 'UNKNOWN',
      headwearLikelihood: face.headwearLikelihood ? face.headwearLikelihood : 'UNKNOWN',
    }));
  }

  // Extract object and scene labels detected in the image
  if (Array.isArray(apiResults.labelAnnotations)) {
    importantData.labelAnnotations = apiResults.labelAnnotations.map(label => label.description);
  }

  // Extract content safety ratings
  if (apiResults.safeSearchAnnotation) {
    importantData.safeSearchAnnotation = {
      adult: apiResults.safeSearchAnnotation.adult ? apiResults.safeSearchAnnotation.adult : 'UNKNOWN',
      spoof: apiResults.safeSearchAnnotation.spoof ? apiResults.safeSearchAnnotation.spoof : 'UNKNOWN',
      medical: apiResults.safeSearchAnnotation.medical ? apiResults.safeSearchAnnotation.medical : 'UNKNOWN',
      violence: apiResults.safeSearchAnnotation.violence ? apiResults.safeSearchAnnotation.violence : 'UNKNOWN',
      racy: apiResults.safeSearchAnnotation.racy ? apiResults.safeSearchAnnotation.racy : 'UNKNOWN',
    };
  }

  return importantData;
}

/**
 * Generates a prompt for GPT to create witty messages based on image analysis
 * @param {Object} data - Processed Vision API results
 * @returns {string} Formatted prompt string for GPT
 */
export function JsonData(data) {
  // Process and stringify the Vision API data
  let impVisioApiData = extractImportantData(data);
  impVisioApiData = JSON.stringify(impVisioApiData);

  // Log the processed data for debugging
  console.log(impVisioApiData);

  // Construct the prompt template with instructions and example
  let prompt = `
You are an AI trained to generate witty, emotionally relevant messages based on visual content and metadata. For the given image and its associated metadata, craft a message that reflects the human emotion conveyed in the photo. The message should be creative, relevant, and engaging. Use the metadata to enrich the context of the message.

Here is the metadata for the image:

- Image Description: [Provide a short description or label from Cloud Vision API]
- Labels: [Provide any object or feature labels from Cloud Vision, e.g., "beach", "sunset", "smiling face", etc.]
- Dominant Colors: [e.g., "warm colors", "blue tones", "earthy browns"]
- Text from the Image (if applicable): [e.g., text extracted from the photo using OCR]
- Confidence Score: [Confidence score from Cloud Vision's analysis of the content]
- Image Tags (if applicable): [e.g., "vacation", "happy", "nature"]

Your task: Analyze the image metadata and generate a witty message that reflects the mood or emotion conveyed by the photo. The message should be human-like, clever, and emotionally insightful.

Example Input JSON:
{
  "image_description": "A group of friends laughing on a sunny beach",
  "labels": ["beach", "group of people", "laughter", "sunlight"],
  "dominant_colors": ["yellow", "blue", "green"],
  "text_from_image": "Best day ever!",
  "confidence_score": 0.98,
  "tags": ["vacation", "happiness", "friendship"]
}

Example Output (witty message):
"Looks like the sun isn't the only thing shining today! Your friends bring the warmth and the laughs. Cheers to making memories that sparkle brighter than the beach waves!"

Below is the  image metadata for the image:
Text is not accurate
If text dosent make sense, ignore it
${impVisioApiData}
Please generate a witty message based on the image metadata.
give back only the message 
do not mention about the metadata in the response.
`

  console.log(prompt);
  return prompt;
}


