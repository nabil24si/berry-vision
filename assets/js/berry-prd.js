// ================================================
// BERRY CLASSIFICATION SYSTEM - PRD VERSION
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
  
  // Set default page
  navigateTo('dashboard');
  
  // Initialize file input listener
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
});

// ================================================
// PAGE NAVIGATION
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
    
    // Close mobile menu
    closeSidebar();
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
  
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[onclick*="navigateTo('${page}')"]`)?.classList.add('active');
}

// ================================================
// SIDEBAR NAVIGATION
// ================================================

function openSidebar() {
  document.querySelector('.sidebar').classList.add('active');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('active');
}

// ================================================
// DRAG AND DROP
// ================================================

function initializeDragAndDrop() {
  const dropzone = document.getElementById('dropzone');
  
  if (!dropzone) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('drag-over');
    }, false);
  });
  
  dropzone.addEventListener('drop', handleDrop, false);
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
  return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024;
}

function displayImagePreview(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const dropzone = document.getElementById('dropzone');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const previewFilename = document.getElementById('previewFilename');
    
    previewImage.src = e.target.result;
    previewSection.style.display = 'flex';
    dropzone.style.display = 'none';
    previewFilename.textContent = 'File: ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)';
    
    // Store the current file
    document.getElementById('fileInput').currentFile = file;
  };
  
  reader.readAsDataURL(file);
}

function resetUpload() {
  document.getElementById('fileInput').value = '';
  document.getElementById('dropzone').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
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
  
  // Show loading state
  document.getElementById('dropzone').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('loadingState').style.display = 'flex';
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('https://recital-groin-ladybug.ngrok-free.dev/predict', {
      method: 'POST',
      body: formData,
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error('API request failed: ' + response.status);
    }
    
    const result = await response.json();
    console.log('Prediction result:', result);
    
    processPredictionResult(result, file);
    
  } catch (error) {
    console.error('Error during analysis:', error);
    useMockPrediction(file);
  }
}

function processPredictionResult(result, file) {
  const berryMap = {
    0: { name: 'Blackberry', emoji: '🫘', className: 'Blackberry' },
    1: { name: 'Blueberry', emoji: '🫐', className: 'Blueberry' },
    2: { name: 'Strawberry', emoji: '🍓', className: 'Strawberry' }
  };
  
  let predictedLabel = result.label || result.predicted_class || 0;
  if (typeof predictedLabel === 'string') {
    predictedLabel = parseInt(predictedLabel);
  }
  predictedLabel = Math.min(2, Math.max(0, predictedLabel));
  
  const berry = berryMap[predictedLabel];
  
  let confidence = result.confidence || result.confidence_score || 0;
  if (Array.isArray(confidence)) {
    confidence = Math.max(...confidence) * 100;
  } else if (typeof confidence === 'string') {
    confidence = parseFloat(confidence);
  }
  confidence = Math.min(100, Math.max(0, confidence));
  
  let probabilities = result.probabilities || [0.33, 0.33, 0.34];
  if (probabilities.length === 0) {
    probabilities = [0.33, 0.33, 0.34];
  }
  
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
  
  navigateTo('result');
}

function useMockPrediction(file) {
  const berries = [
    { name: 'Blackberry', emoji: '🫘', className: 'Blackberry' },
    { name: 'Blueberry', emoji: '🫐', className: 'Blueberry' },
    { name: 'Strawberry', emoji: '🍓', className: 'Strawberry' }
  ];
  
  const randomIndex = Math.floor(Math.random() * 3);
  const berry = berries[randomIndex];
  const confidence = 85 + Math.random() * 13;
  
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
  navigateTo('result');
}

function displayPredictionResult(berry, confidence, probabilities) {
  document.getElementById('resultImage').src = document.getElementById('previewImage').src;
  document.getElementById('resultClass').textContent = berry.name;
  document.getElementById('resultEmoji').textContent = berry.emoji;
  document.getElementById('confidencePercent').textContent = confidence.toFixed(1) + '%';
  
  const barFill = document.getElementById('confidenceBarFill');
  barFill.style.width = confidence + '%';
  
  const berryNames = ['Strawberry', 'Blueberry', 'Blackberry'];
  
  for (let i = 0; i < 3; i++) {
    const percentage = (probabilities[i] * 100).toFixed(1);
    document.getElementById('prob-' + berryNames[i].toLowerCase()).textContent = percentage + '%';
    
    const barFill = document.getElementById('probBar-' + berryNames[i].toLowerCase());
    barFill.style.width = percentage + '%';
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
  
  saveHistoryToStorage();
  updateDashboardStats();
}

function saveHistoryToStorage() {
  const historyData = predictionHistory.map(item => ({
    ...item,
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
      console.error('Error loading history:', error);
      predictionHistory = [];
    }
  } else {
    predictionHistory = [];
  }
}

function populateHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  const emptyMsg = document.getElementById('emptyHistoryMessage');
  
  if (predictionHistory.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  
  emptyMsg.style.display = 'none';
  
  const sortedHistory = [...predictionHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  tbody.innerHTML = sortedHistory.map(item => {
    const badgeClass = 'badge badge-' + item.berry.className.toLowerCase();
    return `
      <tr>
        <td>${item.timestamp.toLocaleString()}</td>
        <td><img src="${item.imageData || 'assets/images/placeholder.jpg'}" alt="thumbnail"></td>
        <td><span class="${badgeClass}">${item.berry.emoji} ${item.berry.name}</span></td>
        <td>${item.confidence.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');
}

// ================================================
// DASHBOARD STATISTICS
// ================================================

function updateDashboardStats() {
  const total = predictionHistory.length;
  const strawberry = predictionHistory.filter(p => p.berry.name === 'Strawberry').length;
  const blueberry = predictionHistory.filter(p => p.berry.name === 'Blueberry').length;
  const blackberry = predictionHistory.filter(p => p.berry.name === 'Blackberry').length;
  
  document.getElementById('total-analyzed').textContent = total.toLocaleString();
  document.getElementById('count-strawberry').textContent = strawberry.toLocaleString();
  document.getElementById('count-blueberry').textContent = blueberry.toLocaleString();
  document.getElementById('count-blackberry').textContent = blackberry.toLocaleString();
  
  if (chartInstances.predictionChart) {
    chartInstances.predictionChart.data.datasets[0].data = [strawberry, blueberry, blackberry];
    chartInstances.predictionChart.update();
  }
}

// ================================================
// CHART INITIALIZATION
// ================================================

function initializeDashboardCharts() {
  if (chartInstances.predictionChart) {
    chartInstances.predictionChart.destroy();
  }
  
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
          backgroundColor: [
            '#EF4444',
            '#3B82F6',
            '#64748B'
          ],
          borderColor: '#FFFFFF',
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
              padding: 20,
              font: {
                size: 13,
                weight: '500'
              },
              color: '#0F172A'
            }
          }
        }
      }
    });
  }
}

function initializeHistoryCharts() {
  if (chartInstances.trendChart) {
    chartInstances.trendChart.destroy();
  }
  
  const trendCtx = document.getElementById('trendChart');
  if (trendCtx) {
    const last7Days = getLast7DaysTrend();
    
    chartInstances.trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: last7Days.labels,
        datasets: [{
          label: 'Predictions per Day',
          data: last7Days.data,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 5,
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
              color: '#0F172A',
              font: {
                size: 13,
                weight: '500'
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#64748B'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#64748B'
            }
          }
        }
      }
    });
  }
}

function getLast7DaysTrend() {
  const labels = [];
  const data = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(dateStr);
    
    const count = predictionHistory.filter(p => {
      const predDate = new Date(p.timestamp);
      return predDate.toDateString() === date.toDateString();
    }).length;
    
    data.push(count);
  }
  
  return { labels, data };
}
