// ==========================================
// KONFIGURACJA FIREBASE (Wklej tutaj SWÓJ kod z konsoli Firebase)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB0XRFdJ7rVEpMR2xJnQfAYz_RNfCmsUjE",
  authDomain: "multiply-app-a8d1b.firebaseapp.com",
  projectId: "multiply-app-a8d1b",
  storageBucket: "multiply-app-a8d1b.firebasestorage.app",
  messagingSenderId: "683139019856",
  databaseURL: "https://multiply-app-a8d1b-default-rtdb.europe-west1.firebasedatabase.app/",
  appId: "1:683139019856:web:d79769e9b23c34917f0d55"
};



// Inicjalizacja Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Zmienne globalne aplikacji
let myChart = null; 
let currentChartMode = 'profit'; 
let currentChartTime = '24h'; 
let globalItemsArray = []; // Globalna tablica na przedmioty z bazy danych

// Po załadowaniu strony
document.addEventListener("DOMContentLoaded", () => {
    initChart(); // Inicjalizacja wykresu przy starcie
    
    // SŁUCHACZ BAZY DANYCH: Pobiera dane na start i nasłuchuje zmian na żywo w chmurze
    database.ref('items').on('value', (snapshot) => {
        const data = snapshot.val();
        globalItemsArray = [];
        
        if (data) {
            // Przekształcamy obiekt z Firebase na tablicę, którą zna Twój program
            globalItemsArray = Object.keys(data).map(key => ({
                firebaseKey: key, // zachowujemy unikalny klucz Firebase do edycji/usuwania
                ...data[key]
            }));
        }
        
        // Automatyczne odświeżenie wszystkich widoków po jakiejkolwiek zmianie w bazie
        renderAll();
    });

    const savedTheme = localStorage.getItem('multiply_theme');
    if (savedTheme === 'dark') {
        document.body.classList.remove('light-theme');
    } 
});

// Funkcja przełączania zakładki
function switchTab(tabId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    
    const clickedBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.getAttribute('onclick').includes(tabId)
    );
    if(clickedBtn) clickedBtn.classList.add('active');
}

function AddItem() {
    const inventory = document.getElementById('inventory-section');
    inventory.style.display = 'none';

    document.getElementById('add-btn').style.display = 'none';
    document.getElementById('add').style.display = 'block';
    document.getElementById('add-section').style.display = "block";
    document.getElementById('cancel').style.display = 'block';
}

function InsideAddButton() {
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const imageInput = document.getElementById('item-image');
    
    if (name === "" || isNaN(price)) {
        alert("Wprowadź prawidłową nazwę i kwotę zakupu!");
        return; 
    }

    const itemId = Date.now(); // unikalne ID przedmiotu do sortowania po datach

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveItem(itemId, name, price, e.target.result);
        }
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        saveItem(itemId, name, price, "");
    }
}

// ZAPIS DO BAZY: Wysyłamy przedmiot bezpośrednio do chmury Firebase
function saveItem(id, name, price, imgSrc) {
    const newItem = {
        id: id,
        name: name,
        buyPrice: price,
        image: imgSrc,
        status: 'active',
        sellPrice: 0,
        profit: 0
    };

    // Wpychamy nowy rekord do gałęzi 'items' w Firebase
    database.ref('items').push(newItem)
        .then(() => {
            // Reset formularza po udanym zapisie
            document.getElementById('item-name').value = "";
            document.getElementById('item-price').value = "";
            document.getElementById('item-image').value = "";

            // Powrót do widoku głównego
            document.getElementById('inventory-section').style.display = 'block';
            document.getElementById('add-section').style.display = "none";
            document.getElementById('add-btn').style.display = 'block';
            document.getElementById('add').style.display = 'none';

            const cancelBtn = document.getElementById('cancel');
            if (cancelBtn) cancelBtn.style.display = 'none';
        })
        .catch(err => alert("Błąd zapisu w bazie danych: " + err.message));
}

// RENDEROWANIE: Czyta dane z tablicy zsynchronizowanej z Firebase
function renderAll() {
    const activeInv = document.getElementById('active-items-display');
    const soldInv = document.getElementById('sold-items-display');
    const salesDisplay = document.getElementById('sales-display');
    const totalProfitLabel = document.getElementById('total-profit-value');

    activeInv.innerHTML = "";
    soldInv.innerHTML = "";
    salesDisplay.innerHTML = "";

    let totalProfit = 0;

    globalItemsArray.forEach(item => {
        if (item.status === 'active') {
            // Zmiana: przekazujemy unikalny 'firebaseKey' zamiast numerycznego id
            activeInv.innerHTML += `
                <div class="item-card">
                    <img src="${item.image || 'https://via.placeholder.com/200x140'}" alt="Item">
                    <div class="item-card-body">
                        <h4>${item.name}</h4>
                        <p>Kupiono za: <b>${item.buyPrice} zł</b></p>
                        <div class="card-menu">
                            <button class="btn-action-sell" onclick="sellItem('${item.firebaseKey}', '${item.name}', ${item.buyPrice})">Sprzedaj</button>
                            <button class="btn-action-del" onclick="deleteItem('${item.firebaseKey}')">Usuń</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (item.status === 'sold') {
            totalProfit += item.profit;

            soldInv.innerHTML += `
                <div class="item-card item-sold-opacity">
                    <img src="${item.image || 'https://via.placeholder.com/200x140'}" alt="Item">
                    <div class="item-card-body">
                        <h4>${item.name}</h4>
                        <p>Kupiono za: ${item.buyPrice} zł</p>
                        <p>Sprzedano za: ${item.sellPrice} zł</p>
                        <p>Zysk: <span class="profit-green">+${item.profit} zł</span></p>
                    </div>
                </div>
            `;

            salesDisplay.innerHTML += `
                <div class="item-card">
                    <img src="${item.image || 'https://via.placeholder.com/200x140'}" alt="Item">
                    <div class="item-card-body">
                        <h4>${item.name}</h4>
                        <p>Kupione za: ${item.buyPrice} zł</p>
                        <p>Sprzedane za: ${item.sellPrice} zł</p>
                        <p class="profit-green">Zysk: +${item.profit} zł</p>
                    </div>
                </div>
            `;
        }
    });

    if (totalProfitLabel) {
        totalProfitLabel.innerText = `${totalProfit.toFixed(2)} zł`;
    }
    
    updateReportsView();
}

// AKTUALIZACJA REKORDU W FIREBASE: Przeniesienie do sprzedanych
function sellItem(firebaseKey, name, buyPrice) {
    const sellPriceInput = prompt(`Za ile sprzedano przedmiot "${name}"?`);
    const sellPrice = parseFloat(sellPriceInput);

    if (isNaN(sellPrice) || sellPriceInput === null) {
        alert("Niepoprawna kwota!");
        return;
    }

    const profit = sellPrice - buyPrice;

    // Aktualizujemy konkretne pola w gałęzi tego przedmiotu przy użyciu firebaseKey
    database.ref('items/' + firebaseKey).update({
        status: 'sold',
        sellPrice: sellPrice,
        profit: profit
    });
}

// USUWANIE Z FIREBASE
function deleteItem(firebaseKey) {
    if (confirm("Czy na pewno chcesz bezpowrotnie usunąć ten przedmiot z bazy w chmurze?")) {
        database.ref('items/' + firebaseKey).remove();
    }
}

function cancelButton() {
    document.getElementById('inventory-section').style.display = 'block';
    document.getElementById('add-section').style.display = 'none';
    document.getElementById('add').style.display = 'none';
    document.getElementById('cancel').style.display = 'none';
    document.getElementById('add-btn').style.display = 'block';
}

function whiteMotyw() {
    document.body.classList.add('light-theme');
    localStorage.setItem('multiply_theme', 'light');
}

function blackMotyw() {
    document.body.classList.remove('light-theme');
    localStorage.setItem('multiply_theme', 'dark');
}

function initChart() {
    const ctx = document.getElementById('multiplyChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Zysk (zł)',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af' } },
                x: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateReportsView() {
    const listContainer = document.getElementById('recent-sales-list');
    if (!listContainer) return;

    listContainer.innerHTML = "";
    
    // Pracujemy na zsynchronizowanej z Firebase tablicy globalnej
    let soldItems = globalItemsArray.filter(item => item.status === 'sold');

    const now = Date.now(); 
    let timeLimit = 0;      

    if (currentChartTime === '1h') {
        timeLimit = now - (60 * 60 * 1000); 
    } else if (currentChartTime === '24h') {
        timeLimit = now - (24 * 60 * 60 * 1000); 
    } else if (currentChartTime === '3d') {
        timeLimit = now - (3 * 24 * 60 * 60 * 1000); 
    } else if (currentChartTime === '7d') {
        timeLimit = now - (7 * 24 * 60 * 60 * 1000); 
    } else if (currentChartTime === '1m') {
        timeLimit = now - (30 * 24 * 60 * 60 * 1000); 
    }

    let filteredItems = soldItems.filter(item => item.id >= timeLimit);

    let displayList = [...filteredItems].sort((a, b) => b.id - a.id);
    displayList.forEach(item => {
        listContainer.innerHTML += `
            <div class="recent-sale-row">
                <img src="${item.image || 'https://via.placeholder.com/40x40'}" alt="Thumb">
                <div class="recent-sale-info">
                    <h4>${item.name}</h4>
                    <span>+${item.profit} zł</span>
                </div>
            </div>
        `;
    });

    let chartItems = [...filteredItems].sort((a, b) => a.id - b.id);
    
    let labels = [];
    let chartData = [];

    chartItems.forEach(item => {
        let dateObj = new Date(item.id);
        let formattedDate = dateObj.toLocaleDateString('pl-PL', {day: 'numeric', month: 'short'}) + " " + dateObj.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
        
        labels.push(formattedDate);
        
        if (currentChartMode === 'profit') {
            chartData.push(item.profit);
        } else {
            chartData.push(item.sellPrice);
        }
    });

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = chartData;
        myChart.data.datasets[0].label = currentChartMode === 'profit' ? 'Zysk (zł)' : 'Sprzedaż (zł)';
        myChart.data.datasets[0].borderColor = currentChartMode === 'profit' ? '#10b981' : '#3b82f6';
        myChart.data.datasets[0].backgroundColor = currentChartMode === 'profit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)';
        myChart.update();
    }
}

function changeChartType(mode) {
    currentChartMode = mode;
    
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        if (mode === 'profit' && btn.textContent.includes('Zysk')) {
            btn.classList.add('active');
        } else if (mode === 'sales' && btn.textContent.includes('Sprzedaż')) {
            btn.classList.add('active');
        }
    });
    
    updateReportsView();
}

function changeTimePeriod(period) {
    currentChartTime = period;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    updateReportsView();
}