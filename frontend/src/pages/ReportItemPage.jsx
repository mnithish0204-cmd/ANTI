import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Tag, 
  Check, 
  AlertCircle,
  Cpu,
  User
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Electronics',
  'Identity & Cards',
  'Bags & Luggage',
  'Books & Stationery',
  'Clothing & Wearables',
  'Keys & Accessories',
  'Bottles & Flasks',
  'Other'
];

const CAMPUS_BUILDINGS_LIST = [
  { name: 'Main Library', floor: '2nd Floor Reading Room', lat: 12.9716, lng: 77.5946 },
  { name: 'Main Library Entrance Portico', floor: 'Ground Floor', lat: 12.9717, lng: 77.5947 },
  { name: 'Student Center & Lounge', floor: '1st Floor', lat: 12.9722, lng: 77.5952 },
  { name: 'Central Cafeteria', floor: '1st Floor Food Court', lat: 12.9724, lng: 77.5954 },
  { name: 'Computer Science Complex', floor: '2nd Floor Lab', lat: 12.9711, lng: 77.5938 },
  { name: 'Engineering Block A', floor: '3rd Floor', lat: 12.9708, lng: 77.5941 },
  { name: 'Engineering Block B', floor: 'Ground Floor Lobby', lat: 12.9706, lng: 77.5943 },
  { name: 'Science Complex', floor: 'Ground Floor Hall', lat: 12.9728, lng: 77.5949 },
  { name: 'Sports Complex & Gymnasium', floor: 'Ground Floor Courts', lat: 12.9735, lng: 77.5960 },
  { name: 'Campus Auditorium', floor: 'Main Auditorium', lat: 12.9720, lng: 77.5955 }
];

export default function ReportItemPage({ initialType = 'lost', setActivePage, onReportCreated }) {
  const { user, switchDemoUser } = useAuth();
  const [reportType, setReportType] = useState(initialType);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [distinctiveFeatures, setDistinctiveFeatures] = useState('');
  const [privateOwnershipAttribute, setPrivateOwnershipAttribute] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('Main Library');
  const [customLocation, setCustomLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:00');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [validationStatus, setValidationStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid' | 'need_info'
  const [validationMessage, setValidationMessage] = useState('');
  const [relevanceScore, setRelevanceScore] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const validateUploadedImage = async (file, name, cat, desc, col, brd, mdl, feat) => {
    if (!file) return;
    if (!name || !name.trim()) {
      setValidationStatus('need_info');
      setValidationMessage('Please enter an item title to validate image relevance.');
      setRelevanceScore(null);
      return;
    }

    setValidationStatus('validating');
    setValidationMessage('Validating image relevance with CLIP AI...');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('item_name', name.trim());
    formData.append('category', cat || '');
    formData.append('description', desc || '');
    formData.append('color', col || '');
    formData.append('brand', brd || '');
    formData.append('model', mdl || '');
    formData.append('distinctive_features', feat || '');

    try {
      const res = await api.validateImage(formData);
      const score = res.relevanceScore !== undefined ? res.relevanceScore : res.similarity_score;
      setRelevanceScore(score);
      if (res.is_relevant) {
        setValidationStatus('valid');
        setValidationMessage(res.message || '✓ Image matches the entered item.');
      } else {
        setValidationStatus('invalid');
        setValidationMessage(res.message || '⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item.');
      }
    } catch (err) {
      setValidationStatus('invalid');
      setRelevanceScore(0);
      setValidationMessage(err.message || '⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload a valid image file (JPEG, PNG, WEBP).');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg('');
      validateUploadedImage(file, itemName, category, description, color, brand, model, distinctiveFeatures);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setValidationStatus(null);
    setValidationMessage('');
    setRelevanceScore(null);
  };

  useEffect(() => {
    if (!imageFile) return;
    const timer = setTimeout(() => {
      if (!itemName || !itemName.trim()) {
        setValidationStatus('need_info');
        setValidationMessage('Please enter an item title to validate image relevance.');
        setRelevanceScore(null);
      } else {
        validateUploadedImage(imageFile, itemName, category, description, color, brand, model, distinctiveFeatures);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [itemName, category, description, color, brand, model, distinctiveFeatures, imageFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName || !description || !date || !time) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    // Prevent submission if uploaded image is irrelevant
    if (imageFile && validationStatus === 'invalid') {
      setErrorMsg('⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item.');
      return;
    }
    if (imageFile && validationStatus === 'validating') {
      setErrorMsg('Please wait for image relevance validation to complete.');
      return;
    }

    const bldgInfo = CAMPUS_BUILDINGS_LIST.find(b => b.name === selectedBuilding);
    const finalLocation = customLocation 
      ? `${selectedBuilding} - ${customLocation}` 
      : `${selectedBuilding} (${bldgInfo?.floor || 'Main'})`;

    const formData = new FormData();
    formData.append('report_type', reportType);
    formData.append('item_name', itemName);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('brand', brand);
    formData.append('color', color);
    formData.append('model', model);
    formData.append('distinctive_features', distinctiveFeatures);
    formData.append('location', finalLocation);
    formData.append('building', selectedBuilding);
    formData.append('floor', bldgInfo?.floor || '');
    if (bldgInfo?.lat) formData.append('latitude', bldgInfo.lat);
    if (bldgInfo?.lng) formData.append('longitude', bldgInfo.lng);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('private_ownership_attribute', privateOwnershipAttribute || '');
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Trigger AI Scanning overlay
    setScanning(true);
    setErrorMsg('');

    // Ensure session is authenticated
    if (!user) {
      try {
        await switchDemoUser('aarav');
      } catch (err) {
        setErrorMsg('Authentication required. Please click Aarav or Sign In in the top bar.');
        setScanning(false);
        return;
      }
    }

    try {
      // Simulate 1.5s scanning effect for delightful feedback
      await new Promise(r => setTimeout(r, 1500));
      const createdReport = await api.createReport(formData);
      setSubmissionSuccess(createdReport);
      if (onReportCreated) onReportCreated(createdReport);
    } catch (err) {
      setErrorMsg(err.message || 'Report submission failed.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="form-container">
      {/* AI Scanning Overlay */}
      {scanning && (
        <div className="ai-scanning-overlay">
          <div className="ai-pulse-orb">
            <Cpu size={36} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
              Multimodal AI is analyzing your report...
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Extracting visual feature embeddings, indexing semantic attributes, & evaluating smart campus spatial proximity
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {submissionSuccess && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1.5rem', 
            marginBottom: '2rem', 
            background: 'rgba(16, 185, 129, 0.12)', 
            border: '1px solid #10b981' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Check size={22} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#6ee7b7' }}>
              {reportType === 'lost' ? 'Lost Item Report Logged' : 'Found Item Report Logged'}
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)', marginBottom: '1.25rem' }}>
            Your item "{submissionSuccess.item_name}" has been recorded. Multimodal AI automatically scanned existing campus reports and calculated candidate matches.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-success btn-sm" onClick={() => setActivePage('matches')}>
              <Sparkles size={16} />
              View AI Potential Matches
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSubmissionSuccess(null)}>
              Submit Another Report
            </button>
          </div>
        </div>
      )}

      {/* Main Form Panel */}
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        {/* Toggle Report Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
              {reportType === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Our AI multimodal pipeline compares photos, descriptions, location, and time to identify matches.
            </p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '0.25rem' }}>
            <button
              type="button"
              className={`demo-btn ${reportType === 'lost' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1.25rem' }}
              onClick={() => setReportType('lost')}
            >
              Lost Item
            </button>
            <button
              type="button"
              className={`demo-btn ${reportType === 'found' ? 'active' : ''}`}
              style={{ padding: '0.5rem 1.25rem' }}
              onClick={() => setReportType('found')}
            >
              Found Item
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Item Name */}
            <div className="form-group-full">
              <label className="form-label">Item Title / Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Black JBL Wireless Headphones"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category *</label>
              <select 
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="form-label">Brand</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. JBL, Dell, Apple, Nike"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>

            {/* Color */}
            <div>
              <label className="form-label">Color</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Black, Navy Blue, Silver"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
            </div>

            {/* Model */}
            <div>
              <label className="form-label">Model (if known)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Live 650BT, Pro 15, Series 8"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>

            {/* Distinctive Features */}
            <div className="form-group-full">
              <label className="form-label">Distinctive Marks / Features</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Small scratch on left earcup, anime sticker on lid, blue lanyard"
                value={distinctiveFeatures}
                onChange={e => setDistinctiveFeatures(e.target.value)}
              />
            </div>

            {/* Detailed Description */}
            <div className="form-group-full">
              <label className="form-label">Detailed Description *</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                placeholder="Provide details about the item's appearance, condition, contents, or circumstances..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Private Ownership Attribute (Confidential) */}
            {reportType === 'lost' && (
              <div className="form-group-full">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Private Ownership Attribute (Optional)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                    🔒 Confidential · Never displayed publicly
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                  Enter a detail that only the real owner is likely to know. This information will not be shown publicly.
                </p>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Small tear inside left card slot, scratch near bottom-left corner, hidden sticker mark"
                  value={privateOwnershipAttribute}
                  onChange={e => setPrivateOwnershipAttribute(e.target.value)}
                />
              </div>
            )}

            {/* Image Upload Dropzone */}
            <div className="form-group-full">
              <label className="form-label">Item Photo (Used by Vision AI Feature Extractor)</label>
              {imagePreview ? (
                <div className="image-preview-wrapper">
                  <img src={imagePreview} alt="Upload preview" />
                  <button type="button" className="btn-remove-preview" onClick={removeImage}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="image-dropzone">
                  <Upload size={32} style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Click or drag photo to upload
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    JPEG, PNG or WEBP (Max 10MB)
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleImageChange}
                  />
                </label>
              )}

              {/* Image Relevance Validation Result Banner directly below uploaded image */}
              {imageFile && validationStatus && (
                <div 
                  id="image-relevance-feedback"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem 1.15rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    background: validationStatus === 'valid'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : validationStatus === 'invalid'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${
                      validationStatus === 'valid'
                        ? '#10b981'
                        : validationStatus === 'invalid'
                        ? '#ef4444'
                        : 'rgba(255, 255, 255, 0.15)'
                    }`,
                    color: validationStatus === 'valid'
                      ? '#6ee7b7'
                      : validationStatus === 'invalid'
                      ? '#fca5a5'
                      : 'var(--text-sub)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {validationStatus === 'validating' ? (
                      <span>⏳ Validating image relevance with CLIP AI...</span>
                    ) : (
                      <span>{validationMessage}</span>
                    )}
                  </div>

                  {relevanceScore !== null && validationStatus !== 'validating' && (
                    <span 
                      style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: 9999, 
                        fontWeight: 600,
                        background: validationStatus === 'valid' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                        border: `1px solid ${validationStatus === 'valid' ? '#10b981' : '#ef4444'}`
                      }}
                    >
                      AI Relevance Score: {Math.round(relevanceScore * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Campus Building */}
            <div>
              <label className="form-label">Campus Building / Zone *</label>
              <select 
                className="form-select"
                value={selectedBuilding}
                onChange={e => setSelectedBuilding(e.target.value)}
              >
                {CAMPUS_BUILDINGS_LIST.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Specific Room / Floor Details */}
            <div>
              <label className="form-label">Specific Room / Area Note</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 2nd Floor Silent Room, Table 4"
                value={customLocation}
                onChange={e => setCustomLocation(e.target.value)}
              />
            </div>

            {/* Date */}
            <div>
              <label className="form-label">Date *</label>
              <input 
                type="date" 
                className="form-input" 
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="form-label">Approximate Time *</label>
              <input 
                type="time" 
                className="form-input" 
                value={time}
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setActivePage('dashboard')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
              disabled={scanning || (imageFile && validationStatus === 'invalid')}
              title={imageFile && validationStatus === 'invalid' ? "⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item." : ""}
            >
              <Sparkles size={16} />
              Submit Report & Run Multimodal AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
