import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ 
  onImageChange, 
  initialImage = null, 
  initialImageUrl = '', 
  className = '',
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}) => {
  const [previewUrl, setPreviewUrl] = useState(initialImage || initialImageUrl || null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [uploadMethod, setUploadMethod] = useState(initialImage ? 'file' : 'url');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState([]);
  
  const fileInputRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    const newErrors = [];
    
    if (!acceptedTypes.includes(file.type)) {
      newErrors.push(`File type not supported. Accepted: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`);
    }
    
    if (file.size > maxSize) {
      newErrors.push(`File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
    }
    
    return newErrors;
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    const validationErrors = validateFile(file);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors([]);
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Notify parent component
    onImageChange({
      type: 'file',
      file: file,
      previewUrl: url
    });
  };

  // Handle URL input
  const handleUrlChange = (url) => {
    setImageUrl(url);
    setPreviewUrl(url);
    setSelectedFile(null);
    
    // Clear any previous file preview URLs
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // Notify parent component
    onImageChange({
      type: 'url',
      url: url,
      previewUrl: url
    });
  };

  // File input change handler
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadMethod('file');
      handleFileSelect(file);
    }
  };

  // Switch upload method
  const switchUploadMethod = (method) => {
    setUploadMethod(method);
    setErrors([]);
    
    if (method === 'file') {
      setImageUrl('');
      if (previewUrl && !previewUrl.startsWith('blob:')) {
        setPreviewUrl(null);
      }
    } else {
      if (selectedFile) {
        setSelectedFile(null);
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }
    }
  };

  // Remove image
  const removeImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(null);
    setSelectedFile(null);
    setImageUrl('');
    setErrors([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onImageChange({
      type: 'none',
      file: null,
      url: '',
      previewUrl: null
    });
  };

  return (
    <div className={`image-upload ${className}`}>
      <label className="image-upload-label">
        Food Image
        <span className="optional-text">(Optional)</span>
      </label>
      
      {/* Upload Method Toggle */}
      <div className="upload-method-toggle">
        <button
          type="button"
          className={`method-btn ${uploadMethod === 'file' ? 'active' : ''}`}
          onClick={() => switchUploadMethod('file')}
        >
          📁 Upload File
        </button>
        <button
          type="button"
          className={`method-btn ${uploadMethod === 'url' ? 'active' : ''}`}
          onClick={() => switchUploadMethod('url')}
        >
          🔗 Image URL
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="image-upload-errors">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* File Upload Section */}
      {uploadMethod === 'file' && (
        <div className="file-upload-section">
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''} ${previewUrl ? 'has-preview' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="image-preview">
                <img src={previewUrl} alt="Preview" className="preview-image" />
                <div className="image-overlay">
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage();
                    }}
                  >
                    🗑️ Remove
                  </button>
                  <button
                    type="button"
                    className="change-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    📁 Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-zone-content">
                <div className="upload-icon">📸</div>
                <p className="upload-text">
                  Drag & drop an image here, or click to select
                </p>
                <p className="upload-help">
                  Supports: JPEG, PNG, WebP • Max size: {(maxSize / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="file-input-hidden"
          />
        </div>
      )}

      {/* URL Upload Section */}
      {uploadMethod === 'url' && (
        <div className="url-upload-section">
          <div className="url-input-container">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="url-input"
            />
          </div>
          
          {previewUrl && (
            <div className="image-preview url-preview">
              <img 
                src={previewUrl} 
                alt="URL Preview" 
                className="preview-image"
                onError={() => {
                  setPreviewUrl(null);
                  setErrors(['Failed to load image from URL']);
                }}
              />
              <button
                type="button"
                className="remove-image-btn"
                onClick={removeImage}
              >
                🗑️ Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;