# Setting Up the n8n Workflow for Just Speech X

This guide provides detailed instructions for setting up an n8n workflow that works with the Just Speech X application to convert PDF and text documents to audio using Hugging Face text-to-speech models.

## Prerequisites

- An n8n instance (self-hosted or cloud)
- A Hugging Face account with API access
- Basic familiarity with n8n workflows

## Workflow Overview

The n8n workflow follows these steps:

1. Receive the document via webhook
2. Extract text from the document (PDF or TXT)
3. Process the text (optional cleaning and formatting)
4. Convert text to speech using Hugging Face TTS model
5. Send the audio file to the user's email

## Step-by-Step Setup

### 1. Create the Webhook Node

The webhook node serves as the entry point for the workflow, receiving the document and email from the web form.

1. Add a **Webhook** node and configure it:
   - Authentication: None (or add basic auth if needed)
   - HTTP Method: POST
   - Path: `/pdf-to-audio-upload` (or any path you prefer)
   - Response Mode: Last Node
   - Binary Data: **Enabled** (very important!)
   - Options: 
     - Check "Raw Body" 
     - Set Property Name for the Binary Data: `data`

2. Click "Execute Node" to create the webhook. Note the generated URL, which should look like: 
   ```
   https://your-n8n-instance.com/webhook/pdf-to-audio-upload
   ```

3. Update this URL in the `script.js` file of your Just Speech X website.

### 2. Add Extract From File Node

This node will extract text from the uploaded document.

1. Add an **Extract From File** node connected to the Webhook node.

2. Configure the node:
   - Operation: **Extract From PDF** (if the file is a PDF)
   - Binary Property: `data` (matching the property from the webhook)
   - Output Binary Data: Leave checked
   - Output Property Name: `extractedText`

### 3. Add an IF Node for File Type Handling

This conditional node allows handling different file types.

1. Add an **IF** node connected to the Extract From File node.

2. Configure it:
   - Condition: `{{$json["mimeType"].includes('pdf')}}`
   - If the condition is true, it's a PDF and text has already been extracted
   - If false, we'll need a separate branch for text files

### 4. Add a Function Node for Text Processing (Optional)

This node can clean, format, or chunk the extracted text.

1. Add a **Function** node connected to the IF node.

2. Configure it with code like:

```javascript
// Get the text from the appropriate source
let text = '';
if (items[0].json.extractedText) {
  // For PDFs
  text = items[0].json.extractedText;
} else {
  // For text files
  text = Buffer.from(items[0].binary.data.data, 'base64').toString();
}

// Clean and process the text as needed
text = text.replace(/\s+/g, ' ').trim();

// Break into manageable chunks if needed (for large documents)
const maxChunkSize = 5000; // characters
const chunks = [];

if (text.length > maxChunkSize) {
  // Find sentence boundaries to chunk at
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + maxChunkSize, text.length);
    
    // Try to end at a sentence boundary
    if (endIndex < text.length) {
      const sentenceEndMatch = text.substring(startIndex, endIndex + 100).match(/[.!?]\s/);
      if (sentenceEndMatch) {
        endIndex = startIndex + sentenceEndMatch.index + 1;
      }
    }
    
    chunks.push(text.substring(startIndex, endIndex));
    startIndex = endIndex;
  }
} else {
  chunks.push(text);
}

// Return the processed text
return [
  {
    json: {
      processedText: text,
      textChunks: chunks,
      email: items[0].json.emailAddress || items[0].json.email,
      fileName: items[0].json.fileName || 'document'
    }
  }
];
```

### 5. Add an HTTP Request Node for Hugging Face API

This node sends the text to the Hugging Face API for conversion to speech.

1. Add an **HTTP Request** node connected to the Function node.

2. Configure it:
   - Method: POST
   - URL: `https://api-inference.huggingface.co/models/microsoft/speecht5_tts`
   - Authentication: None
   - Headers:
     - Key: `Authorization`
     - Value: `Bearer YOUR_HUGGING_FACE_API_KEY`
     - Key: `Content-Type`
     - Value: `application/json`
   - Body Format: JSON
   - JSON Body:
   ```json
   {
     "inputs": "{{$node["Function"].json["processedText"]}}"
   }
   ```
   - Response Format: File
   - Response Binary Property: `audioData`

   Alternatively, if your n8n instance has the **Hugging Face Inference Model** node, you can use that instead of the HTTP Request node.

### 6. Add a Send Email Node

This node sends the audio file to the user's email.

1. Add a **Send Email** node connected to the HTTP Request node.

2. Configure it:
   - Authentication: Choose your email service
   - From Email: Your email address
   - To Email: `{{$node["Function"].json["email"]}}`
   - Subject: `Your Document Has Been Converted to Audio`
   - Text: 
   ```
   Hello,
   
   Your document has been successfully converted to audio. The audio file is attached to this email.
   
   Thank you for using Just Speech X!
   ```
   - Attachments: 
     - Binary Property: `audioData`
     - File Name: `{{$node["Function"].json["fileName"]}}.mp3`

### 7. Add Error Handling

For better error handling, you can add additional nodes:

1. Add an **Error Trigger** node to catch any workflow errors.
2. Connect it to a **Send Email** node to notify the user of any errors.

## Advanced Configuration

### Handling Large Documents

For large documents, you may need to use a loop to process text chunks separately:

1. Use the **Split In Batches** node after the Function node to process text chunks.
2. Create a loop with the HTTP Request node for each chunk.
3. Use the **Merge** node to combine all audio files.
4. Use **Move Binary Data** to merge audio files into a single file.

### Using Different TTS Models

You can easily switch to different Hugging Face models by changing the URL in the HTTP Request node:

- Microsoft SpeechT5: `https://api-inference.huggingface.co/models/microsoft/speecht5_tts`
- Suno Bark: `https://api-inference.huggingface.co/models/suno/bark`
- XTTS-v2: `https://api-inference.huggingface.co/models/coqui/XTTS-v2`

## Testing the Workflow

1. Deploy your Just Speech X website
2. Test the form submission with a small PDF or TXT file
3. Check the n8n workflow execution to ensure all nodes are functioning correctly
4. Verify that the email is sent with the audio file attached

## Troubleshooting

- **Webhook issues**: Ensure your n8n instance is publicly accessible if hosting the website externally
- **File size issues**: Adjust the n8n configuration to accept larger files if needed
- **Hugging Face API errors**: Check your API key and model availability
- **Email delivery issues**: Verify your email service configuration in n8n