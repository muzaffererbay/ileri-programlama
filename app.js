// API Anahtarı
const apiKey = "a8f9cd37c5dd76312945ba6a4a7aa906";

// Harita başlatılırken sadece bir kez oluşturulur
const map = L.map('map').setView([41.0082, 28.9784], 6); // Varsayılan İstanbul koordinatları
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Harita üzerine işaretçi eklemek için bir referans
let marker;
let forecastChart; // Grafik referansı

// Harita tıklama olayı
map.on('click', function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    // Mevcut bir işaretçi varsa kaldır
    if (marker) {
        map.removeLayer(marker);
    }

    // Yeni işaretçiyi haritaya ekle
    marker = L.marker([lat, lon]).addTo(map);

    // Konuma göre hava durumunu getir
    getWeatherByCoordinates(lat, lon);
});

// "Konumum" butonuna tıklama
const getLocationWeatherBtn = document.getElementById("getLocationWeatherBtn");
getLocationWeatherBtn.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        getWeatherByCoordinates(latitude, longitude);
    }, () => {
        alert("Konum bilgisi alınamadı.");
    });
});

// "Hava Durumunu Getir" butonuna tıklama
const getWeatherBtn = document.getElementById("getWeatherBtn");
getWeatherBtn.addEventListener("click", () => {
    const city = document.getElementById("cityInput").value.trim(); // Girdiği şehir adı
    if (city) {
        getWeatherByCity(city); // Şehirle hava durumu al
    } else {
        alert("Lütfen bir şehir adı girin!");
    }
});

// Şehir adıyla hava durumu getir
async function getWeatherByCity(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=tr`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Şehir bulunamadı.");
        const data = await response.json();
        displayWeather(data);
        getWeatherByCoordinates(data.coord.lat, data.coord.lon);
    } catch (error) {
        document.getElementById("weatherResult").innerHTML = `<p>${error.message}</p>`;
    }
}

// Konum bilgisine dayalı hava durumu getir
async function getWeatherByCoordinates(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${apiKey}&units=metric&lang=tr`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Veri alınamadı.");
        const data = await response.json();
        const city = await getCityName(lat, lon);
        displayWeather({
            name: city,
            temp: data.current.temp,
            weather: data.current.weather,
            humidity: data.current.humidity,
            wind_speed: data.current.wind_speed,
            visibility: data.current.visibility
        });
        displayHourlyForecast(data.hourly);
        displayEightDayForecastChart(data.daily,lat,lon);
    } catch (error) {
        document.getElementById("weatherResult").innerHTML = `<p>${error.message}</p>`;
    }
}

// Koordinatlardan şehir adı al
async function getCityName(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data[0]?.name || "Bilinmeyen Şehir";
    } catch (error) {
        console.error("Şehir adı alınamadı:", error);
        return "Bilinmeyen Şehir";
    }
}

// Anlık hava durumunu göster
function displayWeather(data) {
    const { name, temp, weather, humidity, wind_speed, visibility } = data;
    const resultDiv = document.getElementById("weatherResult");

    const iconCode = weather[0].icon || '01d';
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

    resultDiv.innerHTML = `
    <div class="weather-card">
        <h2>${name}</h2>
        <img src="${iconUrl}" alt="${weather[0].description}">
        <p>Sıcaklık: ${temp}°C</p>
        <p>Hava Durumu: ${weather[0].description}</p>
        <p>Nem: ${humidity}%</p>
        <p>Rüzgar Hızı: ${wind_speed} m/s</p>
        <p>Görüş Mesafesi: ${(visibility / 1000).toFixed(1)} km</p>
        <button class="add-favorite-btn">Favorilere Ekle</button>
    </div>
    `;

    document.querySelector(".add-favorite-btn").addEventListener("click", () => {
        addFavoriteCity(name, data);
    });
}

// 24 saatlik hava tahminlerini göster
function displayHourlyForecast(hourlyData) {
    const forecastDiv = document.getElementById("forecastResult");
    forecastDiv.innerHTML = "";

    hourlyData.slice(0, 24).forEach((hour) => {
        const time = new Date(hour.dt * 1000).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
        const iconUrl = `https://openweathermap.org/img/wn/${hour.weather[0].icon}.png`;

        forecastDiv.innerHTML += `
            <div class="weather-card small-card">
                <p>${time}</p>
                <img src="${iconUrl}" alt="${hour.weather[0].description}">
                <p>${hour.temp}°C</p>
            </div>
        `;
    });
}
// Geriye dönük 5 günlük hava durumu getir
async function getHistoricalWeather(lat, lon) {
    const apiKey = "464cdd7d4cbe419e8cb73407250501";
    const historicalData = [];

    // Son 5 gün için tarihleri hesapla
    for (let i = 1; i <= 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD formatında

        const apiUrl = `https://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${lat},${lon}&dt=${formattedDate}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error("Geriye dönük veri alınamadı.");
            const data = await response.json();

            // Günlük sıcaklık ve hava durumu ikonunu sakla
            historicalData.push({
                date: formattedDate,
                temp: data.forecast.forecastday[0].day.avgtemp_c,
                icon: data.forecast.forecastday[0].day.condition.icon, // İkon URL'si
            });
        } catch (error) {
            console.error("Historical data fetch error:", error);
        }
    }

    return historicalData;
}

async function displayEightDayForecastChart(dailyData, lat, lon) {
    const dataPoints = []; // Tarih ve sıcaklık verilerini birleştirmek için kullanılacak
    const pointStyles = []; // Her veri noktasına özel ikonlar

    // Geriye dönük 5 günlük veriyi al
    const historicalData = await getHistoricalWeather(lat, lon);

    // Geriye dönük veriyi ekle
    historicalData.forEach(day => {
        dataPoints.push({ date: new Date(day.date), temp: day.temp, color: 'rgba(255, 99, 132, 1)', icon: null });
    });

    // Mevcut 8 günlük tahmini ekle
    dailyData.slice(0, 8).forEach(day => {
        const date = new Date(day.dt * 1000);
        const iconCode = day.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

        const img = new Image();
        img.src = iconUrl;

        dataPoints.push({ date, temp: day.temp.day, color: 'rgba(75, 192, 192, 1)', icon: img });
    });

    // Tarihe göre sıralama yap
    dataPoints.sort((a, b) => a.date - b.date);

    // Sıralanmış verileri ayrı dizilere aktar
    const labels = dataPoints.map(point => point.date.toLocaleDateString("tr-TR", { day: '2-digit', month: 'short' }));
    const temperatures = dataPoints.map(point => point.temp);
    const segmentColors = dataPoints.map(point => point.color);
    const pointIcons = dataPoints.map(point => point.icon);

    const ctx = document.getElementById('forecastChart').getContext('2d');

    if (forecastChart) {
        forecastChart.destroy();
    }

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Sıcaklık (°C)',
                data: temperatures,
                borderWidth: 2,
                pointRadius: 10,
                pointStyle: pointIcons,
                segment: {
                    borderColor: function (context) {
                        return segmentColors[context.p0DataIndex];
                    },
                },
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${temperatures[context.dataIndex]}°C`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tarih',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold',
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Sıcaklık (°C)',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold',
                        }
                    },
                    beginAtZero: false
                }
            }
        }
    });
}


// Favori şehirler dizisi
let favoriteCities = [];

// Favori şehri ekle
function addFavoriteCity(city, weatherData) {
    if (!favoriteCities.some(fav => fav.city === city)) { // Şehir zaten favorilerde değilse
        favoriteCities.push({ city, weatherData });
        updateFavoriteCities(); // Favori şehirleri güncelle
    } else {
        alert(`${city} zaten favorilerde.`);
    }
}

function updateFavoriteCities() {
    const favoriteCitiesList = document.getElementById("favoriteCitiesList");
    favoriteCitiesList.innerHTML = ""; // Eski listeyi temizle

    favoriteCities.forEach(fav => {
        const { city, weatherData } = fav;

        // Hava durumu ikonunu ve detaylarını oluştur
        const iconCode = weatherData.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

        const li = document.createElement("li");
        li.innerHTML = `
            <div>
                <img src="${iconUrl}" alt="${weatherData.weather[0].description}">
                <span>${city}: ${weatherData.temp}°C - ${weatherData.weather[0].description}</span>
                <button class="remove-favorite-btn">Sil</button>
                <button class="show-btn">Göster</button>
            </div>
        `;
        favoriteCitiesList.appendChild(li);

        // Silme butonuna olay bağlama
        const removeBtn = li.querySelector(".remove-favorite-btn");
        removeBtn.addEventListener("click", () => {
            removeFavoriteCity(city);
        });

        // Göster butonuna olay bağlama
        const showBtn = li.querySelector(".show-btn");
        showBtn.addEventListener("click", () => {
            // Şehir bilgilerini getir
            getWeatherByCity(city);
        });
    });
}


function removeFavoriteCity(city) {
    favoriteCities = favoriteCities.filter(fav => fav.city !== city); // Şehri listeden kaldır
    updateFavoriteCities(); // Listeyi yeniden güncelle
}

const cityWeatherList = document.getElementById("cityWeatherList");
const cities = ["Adana", "Ankara", "İstanbul", "Antalya", "Bursa"];

cities.forEach(city => {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=tr`;
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const iconCode = data.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;
            const li = document.createElement("li");
            li.innerHTML = `
                <div>
                    <img src="${iconUrl}" alt="${data.weather[0].description}">
                    <span>${city}: ${data.main.temp}°C - ${data.weather[0].description}</span>
                    <button class="show-btn">Göster</button>
                </div>
            `;
            cityWeatherList.appendChild(li);
            // Göster butonuna olay bağlama
        const showBtn = li.querySelector(".show-btn");
        showBtn.addEventListener("click", () => {
            // Şehir bilgilerini getir
            getWeatherByCity(city);
        });
        })
        .catch(error => console.log("City Weather Error:", error));
});

// Başlangıçta İstanbul'u yükle
document.addEventListener("DOMContentLoaded", () => {
    getWeatherByCity("İstanbul");
    marker = L.marker([41.0082, 28.9784]).addTo(map); // İstanbul işaretçisi
});

