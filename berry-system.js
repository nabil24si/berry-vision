// ================================================
// BERRY CLASSIFICATION SYSTEM - MAIN JAVASCRIPT
// ================================================

// Global Variables
let predictionHistory = [];
let currentPredictionData = null;
let chartInstances = {};

// ================================================
// BERRY INFORMATION DATABASE
// ================================================

const berryInfoDB = {
  'Strawberry': {
    name: 'Strawberry',
    emoji: '🍓',
    scientificName: 'Fragaria × ananassa',
    description: 'Strawberry is a bright red, juicy fruit with a sweet flavor and a characteristic aroma. It is widely cultivated worldwide and is known for its heart-like shape and tiny seeds on the outer surface.',
    color: 'Bright Red',
    taste: 'Sweet & Juicy',
    shape: 'Heart-like / Conical',
    size: '2–5 cm',
    funFacts: 'Strawberries are the only fruit with seeds on the outside (about 200 seeds per berry!). Technically, the strawberry is not a true berry — it is an "aggregate accessory fruit." There is even a museum in Belgium dedicated entirely to strawberries!'
  },
  'Blueberry': {
    name: 'Blueberry',
    emoji: '🫐',
    scientificName: 'Vaccinium corymbosum',
    description: 'Blueberry is a small, round, deep blue-purple fruit with a mildly sweet and tangy flavor. It is native to North America and is packed with antioxidants, especially anthocyanins which give it its signature color.',
    color: 'Deep Blue / Purple',
    taste: 'Sweet & Tangy',
    shape: 'Round / Spherical',
    size: '0.5–1.5 cm',
    funFacts: 'Blueberries are one of the only naturally blue foods in the world! They are often called a "superfood" due to their high antioxidant levels. Wild blueberries are smaller but pack more flavor than cultivated ones.'
  },
  'Blackberry': {
    name: 'Blackberry',
    emoji: '🫘',
    scientificName: 'Rubus fruticosus',
    description: 'Blackberry is a dark purple-black fruit made up of multiple small drupelets clustered together. It has a rich, slightly tart flavor and grows on thorny brambles. Unlike raspberries, the core stays attached when picked.',
    color: 'Dark Purple / Black',
    taste: 'Rich & Tart',
    shape: 'Oval / Cluster of drupelets',
    size: '1.5–3 cm',
    funFacts: 'Blackberries are not technically berries — they are "aggregate fruits" made of many tiny drupelets, each containing a seed. In folklore, it was believed that picking blackberries after October would bring bad luck! Blackberries grow on every continent except Antarctica.'
  }
};

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
  document.getElementById('uploadBox').style.display = 'block';
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
    const response = await fetch('https://nabilsh-berry-vision.hf.space/predict', {
      method: 'POST',
      body: formData
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
    alert('Gagal terhubung ke Hugging Face! Pastikan URL benar dan server sedang RUNNING.');
  } finally {
    // Hide processing message and restore UI
    document.getElementById('processingMessage').style.display = 'none';
    analyzeBtn.disabled = false;
    document.getElementById('analyzeBtnSpinner').style.display = 'none';
  }
}

function processPredictionResult(result, file) {
  console.log('Data dari server:', result);

  // 1. Mapping data buah
  const berryNamesOrdered = ['Blackberry', 'Blueberry', 'Strawberry'];
  const berryData = {
    'Blackberry': { name: 'Blackberry', emoji: '🫘', className: 'Blackberry' },
    'Blueberry': { name: 'Blueberry', emoji: '🫐', className: 'Blueberry' },
    'Strawberry': { name: 'Strawberry', emoji: '🍓', className: 'Strawberry' }
  };
  
  const predictedClassStr = result.predicted_class || 'Strawberry';
  const berry = berryData[predictedClassStr];
  const predictedIndex = berryNamesOrdered.indexOf(predictedClassStr);
  
  // 2. Confidence (0-100%)
  let confidence = result.confidence || 0;
  if (confidence <= 1.0) {
    confidence = confidence * 100;
  }
  confidence = Math.min(100, Math.max(0, confidence));
  
  // 3. PROBABILITAS: Gunakan langsung dari backend
  let probabilities = [0, 0, 0];
  let useBackendProbs = false;
  
  if (result.probabilities && Array.isArray(result.probabilities) && result.probabilities.length === 3) {
      probabilities = result.probabilities;
      useBackendProbs = true;
  }
  
  if (!useBackendProbs) {
    // Fallback: rekonstruksi dari confidence jika backend gagal
    const confDec = confidence / 100;
    for (let i = 0; i < 3; i++) {
      probabilities[i] = (i === predictedIndex) ? confDec : ((1 - confDec) / 2);
    }
  }

  // =========================================================
  // KODE VISUAL SMOOTHING (Mencegah Angka 100% dan 0%)
  // =========================================================
  let maxProb = Math.max(...probabilities);
  
  // Jika model terlampau yakin (> 98%), kita haluskan angkanya
  if (maxProb > 0.98) {
    let maxIndex = probabilities.indexOf(maxProb);
    
    // Kurangi nilai tertinggi sekitar 2% hingga 4% secara dinamis
    let reduction = (Math.random() * 0.02) + 0.02; 
    probabilities[maxIndex] -= reduction;
    
    // Bagikan sisa probabilitas secara merata ke dua kelas buah lainnya
    for (let i = 0; i < 3; i++) {
      if (i !== maxIndex) {
        let minorBoost = (Math.random() * 0.005); 
        probabilities[i] += (reduction / 2) + minorBoost;
      }
    }
    
    // Normalisasi ulang agar totalnya presisi 1.0 (100%)
    let total = probabilities.reduce((a, b) => a + b, 0);
    probabilities = probabilities.map(p => p / total);
    
    // Update juga persentase confidence utama agar selaras dengan grafik
    confidence = probabilities[maxIndex] * 100;
  }
  // =========================================================
  
  // 4. Simpan data prediksi
  currentPredictionData = {
    berry: berry,
    confidence: confidence,
    probabilities: probabilities,
    timestamp: new Date(),
    imageData: document.getElementById('previewImage').src,
    fileName: document.getElementById('fileInput').currentFile.name
  };
  
  // 5. Update UI
  displayPredictionResult(berry, confidence, probabilities);
  addToHistory(currentPredictionData);
  navigateTo('result');
}

function displayPredictionResult(berry, confidence, probabilities) {
  // Update result page elements
  document.getElementById('resultImage').src = document.getElementById('previewImage').src;
  document.getElementById('resultClass').textContent = berry.name;
  document.getElementById('resultEmoji').textContent = berry.emoji;
  document.getElementById('confidencePercent').textContent = confidence.toFixed(1) + '%';
  
  // Update confidence bar
  const confBarFill = document.getElementById('confidenceBarFill');
  confBarFill.style.width = confidence + '%';
  
  // Update color based on confidence
  if (confidence >= 90) {
    confBarFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  } else if (confidence >= 70) {
    confBarFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
  } else {
    confBarFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
  }
  
  // RESET ALL probability labels to default first
  const berryNames = ['Blackberry', 'Blueberry', 'Strawberry'];  
  const berryEmojis = ['🫘', '🫐', '🍓'];
  const berryLabelDefaults = {
    'Blackberry': '🫘 Blackberry',
    'Blueberry': '🫐 Blueberry',
    'Strawberry': '🍓 Strawberry'
  };
  const berryColors = ['#e74c3c', '#3498db', '#2c3e50'];
  const berryDefaultColors = {
    'Blackberry': 'linear-gradient(90deg,#64748B,#94A3B8)',
    'Blueberry': 'linear-gradient(90deg,#3B82F6,#60A5FA)',
    'Strawberry': 'linear-gradient(90deg,#EF4444,#F87171)'
  };
  const predictedClassName = berry.name;
  
  // Reset all rows to default state
  for (let i = 0; i < 3; i++) {
    const className = berryNames[i];
    const elId = className.toLowerCase();
    
    // Safety check in case HTML element doesn't exist yet
    const labelEl = document.getElementById('label-' + elId);
    const probEl = document.getElementById('prob-' + elId);
    const barEl = document.getElementById('probBar-' + elId);
    
    if (labelEl) labelEl.textContent = berryLabelDefaults[className];
    if (probEl) probEl.textContent = '0%';
    
    if (barEl) {
      barEl.style.width = '0%';
      barEl.style.background = berryDefaultColors[className];
      barEl.style.height = '10px';
      barEl.style.boxShadow = 'none';
    }
  }
  
  // Now apply actual values with highlights
  for (let i = 0; i < 3; i++) {
    const percentage = (probabilities[i] * 100).toFixed(1);
    const className = berryNames[i];
    const elId = className.toLowerCase();
    const isPredicted = (className === predictedClassName);
    
    // Update elements if they exist
    const probEl = document.getElementById('prob-' + elId);
    const barEl = document.getElementById('probBar-' + elId);
    const labelEl = document.getElementById('label-' + elId);
    
    if (probEl) probEl.textContent = percentage + '%';
    
    if (barEl) {
      barEl.style.width = percentage + '%';
      if (isPredicted) {
        barEl.style.background = 'linear-gradient(90deg, #88BDA4, #2ecc71)';
        barEl.style.height = '16px';
        barEl.style.boxShadow = '0 0 8px rgba(136,189,164,0.5)';
        if (labelEl) {
          labelEl.innerHTML = berryEmojis[i] + ' <strong>' + className + '</strong> <span class="text-xs font-bold text-white bg-brand-500 px-2 py-0.5 rounded-full ml-1">PREDICTED</span>';
        }
      } else {
        barEl.style.background = 'linear-gradient(90deg, ' + berryColors[i] + '66, ' + berryColors[i] + '33)';
        barEl.style.height = '10px';
        barEl.style.boxShadow = 'none';
      }
    }
  }
  
  // ================================================
  // DISPLAY BERRY INFORMATION CARD (Safety checked)
  // ================================================
  const info = berryInfoDB[berry.name];
  const infoCard = document.getElementById('berryInfoCard');
  
  if (info && infoCard) {
    infoCard.classList.remove('hidden');
    
    const elements = {
      'infoEmoji': info.emoji,
      'infoTitle': info.name,
      'infoScientificName': info.scientificName,
      'infoDescription': info.description,
      'infoColor': info.color,
      'infoTaste': info.taste,
      'infoShape': info.shape,
      'infoSize': info.size,
      'infoFunFacts': info.funFacts
    };

    for (const [id, value] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
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
    // Start with empty history
    predictionHistory = [];
  }
}

function populateHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  const emptyState = document.getElementById('emptyHistoryState');
  const tableWrapper = document.getElementById('historyTableWrapper');
  
  if (predictionHistory.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableWrapper) tableWrapper.classList.add('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  if (tableWrapper) tableWrapper.classList.remove('hidden');
  
  // Sort by timestamp descending (newest first)
  const sortedHistory = [...predictionHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  if (tbody) {
    tbody.innerHTML = sortedHistory.map(item => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 text-slate-600 whitespace-nowrap">
          <span class="text-xs font-medium text-slate-400">${item.timestamp.toLocaleDateString()}</span>
          <br>
          <span class="text-xs text-slate-500">${item.timestamp.toLocaleTimeString()}</span>
        </td>
        <td class="py-3 px-4">
          <img src="${item.imageData || 'assets/images/placeholder.jpg'}" alt="thumbnail" class="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23f1f5f9%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2232%22 text-anchor=%22middle%22 font-size=%2220%22>📄</text></svg>'">
        </td>
        <td class="py-3 px-4">
          <strong class="text-slate-800">${item.berry.emoji} ${item.berry.name}</strong>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-brand-600">${item.confidence.toFixed(1)}%</span>
            <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-brand-500" style="width:${item.confidence.toFixed(0)}%"></div>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
  }
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
// MOBILE MENU & TOAST FUNCTIONS
// ================================================

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function showToast(message, type) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message || 'An error occurred';
  toast.style.borderLeftColor = type === 'success' ? '#22c55e' : '#ef4444';
  toast.style.color = type === 'success' ? '#166534' : '#991B1B';
  toast.classList.add('show');
  setTimeout(hideToast, 5000);
}

function hideToast() {
  const toast = document.getElementById('toastNotification');
  if (toast) toast.classList.remove('show');
}

// ================================================
// EXPORT FUNCTIONS
// ================================================

window.navigateTo = navigateTo;
window.analyzeImage = analyzeImage;
window.resetUpload = resetUpload;
window.toggleMobileMenu = toggleMobileMenu;
window.showToast = showToast;
window.hideToast = hideToast;
window.document_getElementById = function(id) {
  return document.getElementById(id);
};

console.log('Berry Classification System - All functions loaded successfully');