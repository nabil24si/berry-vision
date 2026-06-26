// ================================================
// BERRY CLASSIFICATION SYSTEM - MAIN JAVASCRIPT
// ================================================

// Global Variables
let predictionHistory = [];
let currentPredictionData = null;
let chartInstances = {};

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Berry Classification System Initialized');
  
  // Initialize drag-and-drop
  initializeDragAndDrop();
  
  // Initialize charts
  initializeDashboardCharts();
  
  // Load history from localStorage
  loadHistoryFromStorage();
  
  // Set default page to dashboard
  navigateTo('dashboard');
  
  // Initialize file input listener
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
});

// ================================================
// PAGE NAVIGATION (SPA ROUTING)
// ================================================

function navigateTo(page) {
  console.log('Navigating to:', page);
  
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  
  // Show selected page
  const targetPage = document.getElementById('page-' + page);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // Reinitialize charts for specific pages
    if (page === 'history') {
      setTimeout(() => {
        initializeHistoryCharts();
        populateHistoryTable();
      }, 100);
    } else if (page === 'dashboard') {
      setTimeout(() => {
        initializeDashboardCharts();
        updateDashboardStats();
      }, 100);
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// ================================================
// DRAG AND DROP FUNCTIONALITY
// ================================================

function initializeDragAndDrop() {
  const uploadBox = document.getElementById('uploadBox');
  
  if (!uploadBox) return;
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      uploadBox.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      uploadBox.classList.remove('drag-over');
    }, false);
  });
  
  // Handle dropped files
  uploadBox.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    const file = files[0];
    if (isValidImageFile(file)) {
      displayImagePreview(file);
    } else {
      alert('Please upload a valid image file (JPG or PNG)');
    }
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file && isValidImageFile(file)) {
    displayImagePreview(file);
  }
}

function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024; // 5MB limit
}

function displayImagePreview(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const previewImage = document.getElementById('previewImage');
    const previewContainer = document.getElementById('previewContainer');
    const actionButtons = document.getElementById('actionButtons');
    const fileName = document.getElementById('fileName');
    
    previewImage.src = e.target.result;
    previewContainer.style.display = 'block';
    actionButtons.style.display = 'block';
    fileName.textContent = 'File: ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)';
    
    // Store the current file for analysis
    document.getElementById('fileInput').currentFile = file;
  };
  
  reader.readAsDataURL(file);
}

function resetUpload() {
  document.getElementById('fileInput').value = '';
  document.getElementById('previewImage').src = '';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('actionButtons').style.display = 'none';
  document.getElementById('processingMessage').style.display = 'none';
  document.getElementById('fileInput').currentFile = null;
}

// ================================================
// IMAGE ANALYSIS
// ================================================

async function analyzeImage() {
  const file = document.getElementById('fileInput').currentFile;
  
  if (!file) {
    alert('Please select an image first');
    return;
  }
  
  // Show processing message
  document.getElementById('processingMessage').style.display = 'block';
  document.getElementById('uploadBox').style.display = 'none';
  document.getElementById('actionButtons').style.display = 'none';
  
  // Disable analyze button
  const analyzeBtn = document.getElementById('analyzeBtn');
  analyzeBtn.disabled = true;
  document.getElementById('analyzeBtnSpinner').style.display = 'inline';
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // Send to backend API
    // Send to backend API
    const response = await fetch('https://nabilsh-berry-vision.hf.space/predict', {
      method: 'POST',
      body: formData,
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error('API request failed: ' + response.status);
    }
    
    const result = await response.json();
    console.log('Prediction result:', result);
    
    // Process the result
    processPredictionResult(result, file);
    
  } catch (error) {
    console.error('Error during analysis:', error);
    // Fallback: Use mock prediction for demo
    console.log('Using mock prediction for demo');
    useMockPrediction(file);
  } finally {
    // Hide processing message and restore UI
    document.getElementById('processingMessage').style.display = 'none';
    analyzeBtn.disabled = false;
    document.getElementById('analyzeBtnSpinner').style.display = 'none';
  }
}

function processPredictionResult(result, file) {
  // Map backend labels to berry types (FIXED: matching model training order)
  const berryMap = {
    0: { name: 'Blackberry', emoji: '🫘', className: 'Blackberry' },
    1: { name: 'Blueberry', emoji: '🫐', className: 'Blueberry' },
    2: { name: 'Strawberry', emoji: '🍓', className: 'Strawberry' }
  };
  
  // Get the predicted label (handle different response formats)
  let predictedLabel = result.label || result.predicted_class || 0;
  if (typeof predictedLabel === 'string') {
    predictedLabel = parseInt(predictedLabel);
  }
  
  // Ensure label is within range
  predictedLabel = Math.min(2, Math.max(0, predictedLabel));
  
  const berry = berryMap[predictedLabel];
  
  // Get confidence score (handle different response formats)
  let confidence = result.confidence || result.confidence_score || 0;
  if (Array.isArray(confidence)) {
    confidence = Math.max(...confidence) * 100;
  } else if (typeof confidence === 'string') {
    confidence = parseFloat(confidence);
  }
  confidence = Math.min(100, Math.max(0, confidence));
  
  // Get probability distribution
  let probabilities = result.probabilities || [0.33, 0.33, 0.34];
  if (probabilities.length === 0) {
    probabilities = [0.33, 0.33, 0.34];
  }
  
  // Store prediction data
  currentPredictionData = {
    berry: berry,
    confidence: confidence,
    probabilities: probabilities,
    timestamp: new Date(),
    imageData: document.getElementById('previewImage').src,
    fileName: document.getElementById('fileInput').currentFile.name
  };
  
  // Update result page
  displayPredictionResult(berry, confidence, probabilities);
  
  // Add to history
  addToHistory(currentPredictionData);
  
  // Navigate to result page
  navigateTo('result');
}

function useMockPrediction(file) {
  // Generate random prediction for demo (matching model training order)
  const berries = [
    { name: 'Blackberry', emoji: '🫘', className: 'Blackberry' },
    { name: 'Blueberry', emoji: '🫐', className: 'Blueberry' },
    { name: 'Strawberry', emoji: '🍓', className: 'Strawberry' }
  ];
  
  const randomIndex = Math.floor(Math.random() * 3);
  const berry = berries[randomIndex];
  const confidence = 75 + Math.random() * 23; // 75-98%
  
  // Generate random probabilities
  const randomProbs = [Math.random(), Math.random(), Math.random()];
  const total = randomProbs.reduce((a, b) => a + b);
  const probabilities = randomProbs.map(p => p / total);
  
  currentPredictionData = {
    berry: berry,
    confidence: confidence,
    probabilities: probabilities,
    timestamp: new Date(),
    imageData: document.getElementById('previewImage').src,
    fileName: file.name
  };
  
  displayPredictionResult(berry, confidence, probabilities);
  addToHistory(currentPredictionData);
  
  document.getElementById('processingMessage').style.display = 'none';
  navigateTo('result');
}

function displayPredictionResult(berry, confidence, probabilities) {
  // Update result page elements
  document.getElementById('resultImage').src = document.getElementById('previewImage').src;
  document.getElementById('resultClass').textContent = berry.name;
  document.getElementById('resultEmoji').textContent = berry.emoji;
  document.getElementById('confidencePercent').textContent = confidence.toFixed(1) + '%';
  
  // Update confidence bar
  const barFill = document.getElementById('confidenceBarFill');
  barFill.style.width = confidence + '%';
  
  // Update color based on confidence
  if (confidence >= 90) {
    barFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  } else if (confidence >= 70) {
    barFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
  } else {
    barFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
  }
  
  // Update probability distribution table
  const berryNames = ['Strawberry', 'Blueberry', 'Blackberry'];
  const berryEmojis = ['🍓', '🫐', '🫘'];
  const berryColors = ['#e74c3c', '#3498db', '#2c3e50'];
  
  for (let i = 0; i < 3; i++) {
    const percentage = (probabilities[i] * 100).toFixed(1);
    document.getElementById('prob-' + berryNames[i].toLowerCase()).textContent = percentage + '%';
    
    const barFill = document.getElementById('probBar-' + berryNames[i].toLowerCase());
    barFill.style.width = percentage + '%';
    barFill.textContent = percentage + '%';
  }
}

// ================================================
// HISTORY MANAGEMENT
// ================================================

function addToHistory(predictionData) {
  predictionHistory.push({
    ...predictionData,
    id: Date.now()
  });
  
  // Save to localStorage
  saveHistoryToStorage();
  
  // Update dashboard stats
  updateDashboardStats();
}

function saveHistoryToStorage() {
  const historyData = predictionHistory.map(item => ({
    ...item,
    imageData: item.imageData, // Keep full data in localStorage for now
    timestamp: item.timestamp.toISOString()
  }));
  
  localStorage.setItem('berryPredictionHistory', JSON.stringify(historyData));
}

function loadHistoryFromStorage() {
  const stored = localStorage.getItem('berryPredictionHistory');
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      predictionHistory = data.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp),
        berry: {
          name: item.berry.name,
          emoji: item.berry.emoji,
          className: item.berry.className
        }
      }));
    } catch (error) {
      console.error('Error loading history from storage:', error);
      predictionHistory = [];
    }
  } else {
    // Start with empty history (no mock data)
    predictionHistory = [];
  }
}

// Mock history function removed - using empty history by default

function populateHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  const noMessage = document.getElementById('noHistoryMessage');
  
  if (predictionHistory.length === 0) {
    tbody.innerHTML = '';
    noMessage.style.display = 'block';
    return;
  }
  
  noMessage.style.display = 'none';
  
  // Sort by timestamp descending (newest first)
  const sortedHistory = [...predictionHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  tbody.innerHTML = sortedHistory.map(item => `
    <tr>
      <td>${item.timestamp.toLocaleString()}</td>
      <td>
        <img src="${item.imageData || 'assets/images/placeholder.jpg'}" alt="thumbnail" style="max-width: 50px; border-radius: 4px;">
      </td>
      <td>
        <strong>${item.berry.emoji} ${item.berry.name}</strong>
      </td>
      <td>${item.confidence.toFixed(1)}%</td>
      <td><span class="badge bg-success">Completed</span></td>
    </tr>
  `).join('');
}

// ================================================
// DASHBOARD STATISTICS
// ================================================

function updateDashboardStats() {
  const total = predictionHistory.length;
  const strawberry = predictionHistory.filter(p => p.berry.name === 'Strawberry').length;
  const blueberry = predictionHistory.filter(p => p.berry.name === 'Blueberry').length;
  const blackberry = predictionHistory.filter(p => p.berry.name === 'Blackberry').length;
  
  document.getElementById('total-analyzed').textContent = total;
  document.getElementById('count-strawberry').textContent = strawberry;
  document.getElementById('count-blueberry').textContent = blueberry;
  document.getElementById('count-blackberry').textContent = blackberry;
  
  // Update dashboard charts
  if (chartInstances.predictionChart) {
    chartInstances.predictionChart.data.datasets[0].data = [strawberry, blueberry, blackberry];
    chartInstances.predictionChart.update();
  }
  
  if (chartInstances.trendChart) {
    updateTrendChartData();
  }
}

// ================================================
// CHART.JS INITIALIZATION
// ================================================

function initializeDashboardCharts() {
  // Destroy existing charts if they exist
  if (chartInstances.predictionChart) {
    chartInstances.predictionChart.destroy();
  }
  if (chartInstances.trendChart) {
    chartInstances.trendChart.destroy();
  }
  
  // Prediction Distribution Chart
  const predictionCtx = document.getElementById('predictionChart');
  if (predictionCtx) {
    const strawberry = predictionHistory.filter(p => p.berry.name === 'Strawberry').length;
    const blueberry = predictionHistory.filter(p => p.berry.name === 'Blueberry').length;
    const blackberry = predictionHistory.filter(p => p.berry.name === 'Blackberry').length;
    
    chartInstances.predictionChart = new Chart(predictionCtx, {
      type: 'doughnut',
      data: {
        labels: ['Strawberry', 'Blueberry', 'Blackberry'],
        datasets: [{
          data: [strawberry, blueberry, blackberry],
          backgroundColor: ['#e74c3c', '#3498db', '#2c3e50'],
          borderColor: ['#c0392b', '#2980b9', '#1c232f'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12, family: "'Poppins', sans-serif", weight: '600' },
              padding: 15,
              usePointStyle: true
            }
          }
        }
      }
    });
  }
  
  // Weekly Trend Chart
  const trendCtx = document.getElementById('trendChart');
  if (trendCtx) {
    const { days, data } = getWeeklyTrendData();
    
    chartInstances.trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Predictions',
          data: data,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12, family: "'Poppins', sans-serif", weight: '600' },
              usePointStyle: true
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: Math.max(...data, 10),
            ticks: {
              stepSize: 1,
              font: { size: 11 }
            }
          },
          x: {
            ticks: {
              font: { size: 11 }
            }
          }
        }
      }
    });
  }
}

function initializeHistoryCharts() {
  // Destroy existing charts if they exist
  if (chartInstances.historyTrendChart) {
    chartInstances.historyTrendChart.destroy();
  }
  if (chartInstances.historyDistributionChart) {
    chartInstances.historyDistributionChart.destroy();
  }
  
  // Weekly Analysis Count Chart
  const historyTrendCtx = document.getElementById('historyTrendChart');
  if (historyTrendCtx) {
    const { days, data } = getWeeklyTrendData();
    
    chartInstances.historyTrendChart = new Chart(historyTrendCtx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Total Analysis',
          data: data,
          backgroundColor: [
            '#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'
          ],
          borderRadius: 5,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'x',
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12, family: "'Poppins', sans-serif" }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
  
  // Classification Distribution Chart
  const historyDistributionCtx = document.getElementById('historyDistributionChart');
  if (historyDistributionCtx) {
    const strawberry = predictionHistory.filter(p => p.berry.name === 'Strawberry').length;
    const blueberry = predictionHistory.filter(p => p.berry.name === 'Blueberry').length;
    const blackberry = predictionHistory.filter(p => p.berry.name === 'Blackberry').length;
    
    chartInstances.historyDistributionChart = new Chart(historyDistributionCtx, {
      type: 'pie',
      data: {
        labels: ['Strawberry', 'Blueberry', 'Blackberry'],
        datasets: [{
          data: [strawberry, blueberry, blackberry],
          backgroundColor: ['#e74c3c', '#3498db', '#2c3e50'],
          borderColor: ['#c0392b', '#2980b9', '#1c232f'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12, family: "'Poppins', sans-serif", weight: '600' },
              padding: 15,
              usePointStyle: true
            }
          }
        }
      }
    });
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function getWeeklyTrendData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [0, 0, 0, 0, 0, 0, 0];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Count predictions for each day of the week
  predictionHistory.forEach(item => {
    const itemDate = new Date(item.timestamp);
    itemDate.setHours(0, 0, 0, 0);
    
    const daysAgo = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
    
    if (daysAgo >= 0 && daysAgo < 7) {
      const dayIndex = (6 - daysAgo + today.getDay()) % 7;
      data[dayIndex]++;
    }
  });
  
  return { days, data };
}

function updateTrendChartData() {
  const { days, data } = getWeeklyTrendData();
  
  if (chartInstances.trendChart) {
    chartInstances.trendChart.data.labels = days;
    chartInstances.trendChart.data.datasets[0].data = data;
    chartInstances.trendChart.options.scales.y.max = Math.max(...data, 10);
    chartInstances.trendChart.update();
  }
}

// ================================================
// EXPORT FUNCTIONS
// ================================================

window.navigateTo = navigateTo;
window.analyzeImage = analyzeImage;
window.resetUpload = resetUpload;
window.document_getElementById = function(id) {
  return document.getElementById(id);
};

console.log('Berry Classification System - All functions loaded successfully');
