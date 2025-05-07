# Just Speech X

A modern web-based PDF to audio converter that seamlessly integrates with n8n workflows for text-to-speech conversion.

![Just Speech X Banner](https://img.shields.io/badge/Just%20Speech%20X-Document%20to%20Speech-1a73e8)
![License](https://img.shields.io/badge/license-MIT-green)
![n8n Compatible](https://img.shields.io/badge/n8n-compatible-brightgreen)

## 📖 Overview

Just Speech X provides a simple, user-friendly web interface that allows users to upload PDF or text documents and have them converted to high-quality audio using n8n workflows and Hugging Face text-to-speech models. The application delivers the resulting audio file to the user's email, making it a seamless experience from start to finish.

## ✨ Features

- **Simple Web Interface**: Modern, responsive design that works on desktop and mobile
- **File Support**: Handles PDF and TXT file formats
- **Email Delivery**: Automatically sends the generated audio file to the provided email address
- **Accessibility**: Designed with accessibility in mind, including screen reader support
- **Real-time Feedback**: Shows upload progress and informative status messages
- **Validation**: Validates file types and sizes before uploading
- **GitHub Pages Ready**: Deploy on GitHub Pages with minimal configuration
- **n8n Integration**: Seamlessly connects to your n8n instance for processing

## 🚀 Quick Start

### Option 1: GitHub Pages Deployment

1. Fork this repository to your GitHub account
2. Edit the webhook URL in `script.js` (find the `CONFIG` object and change the `WEBHOOK_URL` value)
3. Go to your repository settings > Pages
4. Enable GitHub Pages from the main branch
5. Visit your new site at `https://[your-username].github.io/Just-Speech-X/`

### Option 2: Manual Deployment

1. Clone this repository:
   ```bash
   git clone https://github.com/Tall-H/Just-Speech-X.git
   cd Just-Speech-X
   ```

2. Update the webhook URL in `script.js`

3. Deploy to any static site hosting service (Netlify, Vercel, etc.) or your own web server

## 📝 Configuration

### Setting Up the n8n Workflow

1. **Create a new n8n workflow**:
   - Start with a Webhook node as the trigger
   - Configure it to accept file uploads (set "Binary Data" to `true`)

2. **Add an Extract From File node**:
   - Connect it to the Webhook node
   - Set "Operation" to "Extract From PDF"
   - Set "Binary Property" to match the Webhook's binary property (usually "data")

3. **Add a Function node** (for text processing):
   - Connect it to the Extract From File node
   - Process the text as needed (chunking, cleaning, etc.)

4. **Add an HTTP Request node** for Hugging Face API:
   - Set method to POST
   - URL: `https://api-inference.huggingface.co/models/[model-name]`
   - Headers:
     - Authorization: `Bearer YOUR_HUGGING_FACE_API_KEY`
     - Content-Type: `application/json`
   - Body: 
     ```json
     {
       "inputs": "{{$node["Function"].json["processedText"]}}"
     }
     ```

5. **Add a Send Email node**:
   - Connect it to the HTTP Request node
   - Configure with your email service credentials
   - Use the webhook input to get the recipient's email
   - Attach the audio file from the HTTP Request node

### Recommended Hugging Face Models

For text-to-speech conversion, we recommend the following models:

- **Microsoft SpeechT5**: High quality with natural sounding speech
- **Suno/Bark**: Excellent for multiple languages and natural inflection
- **XTTS-v2**: Great for voice cloning capabilities
- **Balacoon TTS**: Good balance between quality and performance

## 📄 File Structure

- `index.html` - Main web interface
- `style.css` - All styling for the application
- `script.js` - Client-side functionality and validation
- `README.md` - This documentation file

## 🔧 Customization

### Modifying the Interface

The interface is built with standard HTML, CSS, and JavaScript, making it easy to customize:

- Change colors and styles in `style.css` (look for the `:root` CSS variables)
- Modify the HTML structure in `index.html`
- Adjust functionality in `script.js`

### Changing File Limitations

By default, the application is configured to accept PDF and TXT files up to 10MB in size. You can modify these settings in the `CONFIG` object in `script.js`:

```javascript
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_FILE_TYPES: ['.pdf', '.txt'],
    // other config options...
};
```

## 🧰 Troubleshooting

### Common Issues

1. **Webhook URL not working**:
   - Make sure your n8n instance is running and accessible
   - Verify the webhook URL in `script.js`
   - Check if your n8n instance allows file uploads

2. **File size issues**:
   - n8n may have file size limitations; adjust them in your n8n configuration
   - The default MAX_FILE_SIZE in the app is 10MB

3. **CORS errors**:
   - Ensure your n8n instance has CORS properly configured
   - Add your website origin to the allowed origins in n8n

### Debugging

For debugging, open your browser's developer console (F12) to see any JavaScript errors or log messages.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 🙏 Acknowledgements

- [n8n](https://n8n.io) for the powerful workflow automation
- [Hugging Face](https://huggingface.co) for the text-to-speech models
- [Font Awesome](https://fontawesome.com) for the icons used in the interface