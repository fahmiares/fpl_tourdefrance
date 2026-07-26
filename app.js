// Konfigurasi Etape
const ETAPES = [
    { name: "Etape 1", start: 1, end: 4 },
    { name: "Etape 2", start: 5, end: 8 },
    { name: "Etape 3", start: 9, end: 12 },
    { name: "Etape 4", start: 13, end: 16 },
    { name: "Etape 5", start: 17, end: 20 },
    { name: "Etape 6", start: 21, end: 24 },
    { name: "Etape 7", start: 25, end: 28 },
    { name: "Etape 8", start: 29, end: 32 },
    { name: "Etape 9", start: 33, end: 38 }
];

const TOTAL_GW = 38;

// Data State
let managersData = [];

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupNavigation();
    setupAdminTable();
    renderAdminTable();
    calculateAndRenderDashboard();
    setupEventListeners();
});

// Navigation Logic
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.view-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            // Proteksi Password untuk Tab Admin
            if (targetId === 'admin-view') {
                if (!sessionStorage.getItem('isAdmin')) {
                    const pass = prompt('Masukkan Password Admin:');
                    if (pass === 'fpl-tour2026') {
                        sessionStorage.setItem('isAdmin', 'true');
                    } else {
                        if (pass !== null) alert('Password salah!');
                        return; // Batalkan perpindahan tab
                    }
                }
            }

            // Remove active class from all
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// Data Management
async function loadData() {
    // 1. Coba ambil data.json dari server hosting (untuk akses publik peserta)
    try {
        const response = await fetch('data.json', { cache: "no-store" });
        if (response.ok) {
            managersData = await response.json();
            // Sinkronkan localStorage admin dengan data server terbaru
            localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
            return;
        }
    } catch (e) {
        console.log('data.json tidak ditemukan atau diakses via file://, menggunakan localStorage.');
    }

    // 2. Fallback: Gunakan localStorage jika data.json gagal ditarik
    const saved = localStorage.getItem('fplTourDeFranceData');
    if (saved) {
        try {
            managersData = JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing data:', e);
            managersData = [];
        }
    } else {
        managersData = [];
    }
}

function saveData() {
    // Read from DOM before saving
    const rows = document.querySelectorAll('#admin-table-body tr');
    const newData = [];
    
    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        const fplId = row.querySelector('.m-fplid-input').value;
        const name = row.querySelector('.m-name-input').value;
        const team = row.querySelector('.m-team-input').value;
        
        const scores = [];
        for (let i = 0; i < TOTAL_GW; i++) {
            const val = parseInt(row.querySelector(`.score-input[data-gw="${i+1}"]`).value) || 0;
            scores.push(val);
        }
        
        newData.push({ id, fplId, name, team, scores });
    });
    
    managersData = newData;
    localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
    
    showToast();
    calculateAndRenderDashboard();
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function addManager() {
    managersData.push({
        id: generateId(),
        fplId: "",
        name: "Nama Baru",
        team: "Tim Baru",
        scores: Array(TOTAL_GW).fill(0)
    });
    renderAdminTable();
}

function deleteManager(id) {
    if(confirm('Yakin ingin menghapus manajer ini?')) {
        managersData = managersData.filter(m => m.id !== id);
        renderAdminTable();
    }
}

// Admin Table Setup & Render
function setupAdminTable() {
    const thead = document.getElementById('admin-table-head');
    
    // Create GW headers
    for (let i = 1; i <= TOTAL_GW; i++) {
        const th = document.createElement('th');
        th.textContent = `GW${i}`;
        // Add etape divider class if it's the end of an etape
        const isEtapeEnd = ETAPES.some(e => e.end === i);
        if (isEtapeEnd && i !== TOTAL_GW) {
            th.classList.add('etape-divider');
        }
        thead.appendChild(th);
    }
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '';
    
    const countSpan = document.getElementById('total-managers-count');
    if (countSpan) {
        countSpan.textContent = `${managersData.length} Cyclist`;
    }
    
    managersData.forEach(manager => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', manager.id);
        
        let html = `
            <td class="sticky-col-aksi">
                <div style="display:flex; gap: 5px;">
                    <button class="btn btn-primary" onclick="syncSingleManager('${manager.id}', this)" title="Sync FPL Data" style="padding: 5px 8px; font-size: 0.9rem;"><i class="ri-refresh-line"></i></button>
                    <button class="btn btn-danger" onclick="deleteManager('${manager.id}')" title="Hapus Cyclist" style="padding: 5px 8px; font-size: 0.9rem;"><i class="ri-delete-bin-line"></i></button>
                </div>
            </td>
            <td class="sticky-col-0"><input type="text" class="input-name m-name-input" value="${manager.name}" placeholder="Nama Cyclist"></td>
            <td class="sticky-col"><input type="text" class="input-name m-team-input" value="${manager.team}" placeholder="Nama Tim"></td>
            <td class="sticky-col-2"><input type="text" class="input-name m-fplid-input" value="${manager.fplId || ''}" placeholder="ID Tim FPL"></td>
        `;
        
        for (let i = 0; i < TOTAL_GW; i++) {
            const isEtapeEnd = ETAPES.some(e => e.end === (i+1));
            const dividerClass = (isEtapeEnd && i !== TOTAL_GW - 1) ? 'etape-divider' : '';
            html += `<td class="${dividerClass}"><input type="number" class="input-cell score-input" data-gw="${i+1}" value="${manager.scores[i] || 0}" min="0"></td>`;
        }
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// Calculation Logic
function calculateAndRenderDashboard() {
    if (managersData.length === 0) return;

    // PRE-CALCULATE BASE STATS FOR EVERYONE
    // totalPoints, maxGwScore, maxEtapeScore
    const baseStats = {};
    managersData.forEach(m => {
        baseStats[m.id] = {
            totalPoints: 0,
            maxGwScore: 0,
            maxEtapeScore: 0,
            sprintPoints: 0,
            mountainPoints: 0
        };
        
        // Calculate totalPoints and maxGwScore
        m.scores.forEach(score => {
            const s = score || 0;
            baseStats[m.id].totalPoints += s;
            if (s > baseStats[m.id].maxGwScore) {
                baseStats[m.id].maxGwScore = s;
            }
        });

        // Calculate maxEtapeScore
        ETAPES.forEach(etape => {
            let etapeSum = 0;
            for (let gw = etape.start - 1; gw < etape.end; gw++) {
                etapeSum += (m.scores[gw] || 0);
            }
            if (etapeSum > baseStats[m.id].maxEtapeScore) {
                baseStats[m.id].maxEtapeScore = etapeSum;
            }
        });
    });

    // CALCULATE SPRINT POINTS (Green Jersey)
    for (let gw = 0; gw < TOTAL_GW; gw++) {
        let highest = -1;
        let winners = [];
        
        managersData.forEach(m => {
            const score = m.scores[gw] || 0;
            if (score > highest && score > 0) {
                highest = score;
                winners = [m.id];
            } else if (score === highest && score > 0) {
                winners.push(m.id);
            }
        });
        winners.forEach(id => baseStats[id].sprintPoints++);
    }

    // CALCULATE MOUNTAIN POINTS (Polkadot Jersey)
    ETAPES.forEach(etape => {
        let highest = -1;
        let winners = [];

        managersData.forEach(m => {
            let etapeSum = 0;
            for (let gw = etape.start - 1; gw < etape.end; gw++) {
                etapeSum += (m.scores[gw] || 0);
            }

            if (etapeSum > highest && etapeSum > 0) {
                highest = etapeSum;
                winners = [m.id];
            } else if (etapeSum === highest && etapeSum > 0) {
                winners.push(m.id);
            }
        });
        
        // Aturan Baru: Etape 9 bernilai 2 poin, Etape 1-8 bernilai 1 poin
        const poinBobot = (etape.name === "Etape 9") ? 2 : 1;
        winners.forEach(id => baseStats[id].mountainPoints += poinBobot);
    });

    // ASSEMBLE FULL DATA
    const fullData = managersData.map(m => {
        const tp = baseStats[m.id].totalPoints;
        const mgw = baseStats[m.id].maxGwScore;
        const me = baseStats[m.id].maxEtapeScore;
        const sp = baseStats[m.id].sprintPoints;
        const mp = baseStats[m.id].mountainPoints;

        return {
            ...m,
            totalPoints: tp,
            maxGwScore: mgw,
            maxEtapeScore: me,
            sprintPoints: sp,
            mountainPoints: mp,
            // SKOR KOMPOSIT DESIMAL UNTUK TIE-BREAK
            compositeYellow: tp + (mgw / 100000) + (me / 100000000),
            compositeGreen: sp + (mgw / 100000) + (tp / 100000000),
            compositePolkadot: mp + (me / 100000) + (tp / 100000000)
        };
    });

    // SORT YELLOW JERSEY (Berdasarkan Komposit)
    const yellowData = [...fullData].sort((a, b) => b.compositeYellow - a.compositeYellow);

    // SORT GREEN JERSEY (Berdasarkan Komposit)
    const greenData = [...fullData].sort((a, b) => b.compositeGreen - a.compositeGreen);

    // SORT POLKADOT JERSEY (Berdasarkan Komposit)
    const polkadotData = [...fullData].sort((a, b) => b.compositePolkadot - a.compositePolkadot);


    // RENDER UI
    renderPodium(yellowData[0], greenData[0], polkadotData[0]);
    renderTables(yellowData, greenData, polkadotData);
    renderTimeline();
}

function renderPodium(yellow, green, polkadot) {
    if (yellow) {
        document.getElementById('yellow-winner').innerHTML = `
            <h3 class="manager-name">${yellow.team}</h3>
            <p class="team-name">${yellow.name}</p>
            <div class="points"><span class="val">${yellow.totalPoints}</span> pts</div>
        `;
    }
    if (green) {
        document.getElementById('green-winner').innerHTML = `
            <h3 class="manager-name">${green.team}</h3>
            <p class="team-name">${green.name}</p>
            <div class="points"><span class="val">${green.sprintPoints}</span> sprint pts</div>
        `;
    }
    if (polkadot) {
        document.getElementById('polkadot-winner').innerHTML = `
            <h3 class="manager-name">${polkadot.team}</h3>
            <p class="team-name">${polkadot.name}</p>
            <div class="points"><span class="val">${polkadot.mountainPoints}</span> mountain pts</div>
        `;
    }
}

function renderTables(yellowData, greenData, polkadotData) {
    // Yellow Table
    const yTbody = document.querySelector('#yellow-table tbody');
    yTbody.innerHTML = yellowData.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="manager-cell">
                <span class="m-name">${m.team}</span>
                <span class="t-name">${m.name}</span>
            </td>
            <td class="val-bold">${m.totalPoints}</td>
        </tr>
    `).join('');

    // Green Table
    const gTbody = document.querySelector('#green-table tbody');
    gTbody.innerHTML = greenData.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="manager-cell">
                <span class="m-name">${m.team}</span>
                <span class="t-name">${m.name}</span>
            </td>
            <td class="val-bold">${m.sprintPoints}</td>
            <td class="tie-break">${m.maxGwScore}</td>
        </tr>
    `).join('');

    // Polkadot Table
    const pTbody = document.querySelector('#polkadot-table tbody');
    pTbody.innerHTML = polkadotData.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="manager-cell">
                <span class="m-name">${m.team}</span>
                <span class="t-name">${m.name}</span>
            </td>
            <td class="val-bold">${m.mountainPoints}</td>
            <td class="tie-break">${m.maxEtapeScore}</td>
        </tr>
    `).join('');
}

function renderTimeline() {
    if (managersData.length === 0) return;

    // Determine highest GW with points > 0
    let maxGwPlayed = 0;
    managersData.forEach(m => {
        for(let i=0; i<TOTAL_GW; i++) {
            if (m.scores[i] > 0 && (i+1) > maxGwPlayed) {
                maxGwPlayed = i+1;
            }
        }
    });

    let completedStages = 0;

    ETAPES.forEach((etape, index) => {
        const stageEl = document.getElementById(`stage-${index + 1}`);
        if (!stageEl) return;

        // Reset classes
        stageEl.classList.remove('completed', 'current');

        if (maxGwPlayed >= etape.end) {
            stageEl.classList.add('completed');
            completedStages++;
        } else if (maxGwPlayed >= etape.start && maxGwPlayed < etape.end) {
            stageEl.classList.add('current');
        }
    });

    // Update Progress Line
    const trackEl = document.querySelector('.timeline-track');
    if (trackEl) {
        const percentage = Math.min(100, (completedStages / (ETAPES.length - 1)) * 100);
        trackEl.style.setProperty('--progress-width', `${percentage}%`);
    }
}

// Event Listeners & Utilities
function setupEventListeners() {
    document.getElementById('btn-add-manager').addEventListener('click', addManager);
    document.getElementById('btn-save-data').addEventListener('click', saveData);

    // Admin Search Feature
    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#admin-table-body tr');
            rows.forEach(row => {
                const fplId = row.querySelector('.m-id-input') ? row.querySelector('.m-id-input').value.toLowerCase() : '';
                const mName = row.querySelector('.m-name-input') ? row.querySelector('.m-name-input').value.toLowerCase() : '';
                const mTeam = row.querySelector('.m-team-input') ? row.querySelector('.m-team-input').value.toLowerCase() : '';
                
                if (fplId.includes(query) || mName.includes(query) || mTeam.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Download Image Feature
    const btnDownload = document.getElementById('btn-download-image');
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            const captureArea = document.getElementById('capture-area');
            const originalBtnText = btnDownload.innerHTML;
            btnDownload.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memproses...';
            btnDownload.disabled = true;

            setTimeout(() => {
                html2canvas(captureArea, {
                    backgroundColor: '#0f172a',
                    scale: 2, // High resolution
                    onclone: function(clonedDoc) {
                        // Sembunyikan baris klasemen peringkat 11 ke bawah pada hasil clone (menampilkan Top 10)
                        const tables = clonedDoc.querySelectorAll('.ranking-table tbody');
                        tables.forEach(tbody => {
                            const rows = tbody.querySelectorAll('tr');
                            for (let i = 10; i < rows.length; i++) {
                                rows[i].style.display = 'none';
                            }
                        });
                    }
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `Klasemen-FPL-TDF-GW${ETAPES[0].start}.png`; // generic name, wait, better generic:
                    link.download = 'Klasemen-FPL-Tour-De-France.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    btnDownload.innerHTML = originalBtnText;
                    btnDownload.disabled = false;
                }).catch(err => {
                    console.error('Error capturing image:', err);
                    alert('Gagal membuat gambar klasemen. Pastikan koneksi internet stabil.');
                    btnDownload.innerHTML = originalBtnText;
                    btnDownload.disabled = false;
                });
            }, 100);
        });
    }
    
    // Reset Semua Data
    document.getElementById('btn-reset-all').addEventListener('click', () => {
        const pass = prompt('PERINGATAN: Tindakan ini akan menghapus SEMUA data manajer, tim, dan poin di sistem secara permanen.\n\nKetik "RESET" (tanpa tanda kutip, huruf besar semua) untuk melanjutkan:');
        if (pass === 'RESET') {
            managersData = [];
            localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
            renderAdminTable();
            calculateAndRenderDashboard();
            alert('Seluruh data berhasil dihapus. Dasbor kini kembali kosong.');
        } else if (pass !== null) {
            alert('Proses dibatalkan karena kata kunci tidak sesuai.');
        }
    });

    // Export JSON
    document.getElementById('btn-export-data').addEventListener('click', () => {
        saveData(); // Make sure latest data is used
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(managersData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Import JSON
    document.getElementById('btn-import-data').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    managersData = imported;
                    localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
                    renderAdminTable();
                    calculateAndRenderDashboard();
                    alert('Data berhasil di-import!');
                } else {
                    alert('Format file JSON tidak valid.');
                }
            } catch (err) {
                alert('Gagal membaca file JSON.');
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again
        e.target.value = '';
    });

    // Import CSV
    document.getElementById('btn-import-csv').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                if (lines.length > 0) {
                    let startIndex = 0;
                    if (lines[0].toLowerCase().includes('nama manajer')) {
                        startIndex = 1; // Skip header
                    }
                    
                    if (confirm('Import data CSV akan menambahkan manajer baru dan memperbarui data yang ada. Jika ada poin GW di CSV, poin tersebut akan menimpa poin saat ini. Lanjutkan?')) {
                        let addedCount = 0;
                        let updatedCount = 0;
                        let invalidCount = 0;

                        for (let i = startIndex; i < lines.length; i++) {
                            const cols = lines[i].split(',');
                            if (cols.length >= 3) {
                                const csvName = cols[0].trim();
                                const csvTeam = cols[1].trim();
                                const csvFplId = cols[2].trim();
                                
                                // Cari manajer berdasarkan ID (jika ada), atau berdasarkan Nama jika ID kosong
                                let targetManager = managersData.find(m => {
                                    if (csvFplId !== "") {
                                        return m.fplId === csvFplId;
                                    } else {
                                        return m.name.toLowerCase() === csvName.toLowerCase();
                                    }
                                });

                                if (!targetManager) {
                                    // Tambah manajer baru
                                    targetManager = {
                                        id: generateId(),
                                        fplId: csvFplId,
                                        name: csvName,
                                        team: csvTeam,
                                        scores: Array(TOTAL_GW).fill(0)
                                    };
                                    managersData.push(targetManager);
                                    addedCount++;
                                } else {
                                    // Update data dasar
                                    targetManager.name = csvName;
                                    targetManager.team = csvTeam;
                                    if (csvFplId !== "") targetManager.fplId = csvFplId;
                                    updatedCount++;
                                }
                                
                                // Update skor GW dari CSV (mulai kolom ke-4, index 3)
                                for (let gw = 0; gw < TOTAL_GW; gw++) {
                                    if (cols.length > 3 + gw && cols[3 + gw].trim() !== "") {
                                        const parsedScore = parseInt(cols[3 + gw].trim());
                                        if (!isNaN(parsedScore)) {
                                            targetManager.scores[gw] = parsedScore;
                                        }
                                    }
                                }
                            } else {
                                invalidCount++;
                            }
                        }
                        
                        if (addedCount > 0 || updatedCount > 0) {
                            localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
                            renderAdminTable();
                            calculateAndRenderDashboard();
                            
                            let msg = "Import CSV Selesai!\n";
                            if (addedCount > 0) msg += `- Ditambahkan: ${addedCount} manajer baru\n`;
                            if (updatedCount > 0) msg += `- Diperbarui: ${updatedCount} manajer\n`;
                            if (invalidCount > 0) msg += `(Ada ${invalidCount} baris tidak valid yang dilewati)`;
                            alert(msg);
                        } else {
                            alert('Tidak ada data valid yang bisa diimport dari CSV.');
                        }
                    }
                }
            } catch (err) {
                alert('Gagal membaca file CSV.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Sync Function
    async function performSync(btnId, onlyMissing) {
        saveData(); // Save any recent changes first
        
        const btn = document.getElementById(btnId);
        const originalText = btn.innerHTML;
        
        let validManagers = managersData.filter(m => m.fplId && m.fplId.trim() !== "");
        
        if (onlyMissing) {
            // Hanya manajer yang total poinnya masih 0
            validManagers = validManagers.filter(m => {
                const total = m.scores.reduce((sum, s) => sum + (s || 0), 0);
                return total === 0;
            });
        }

        if (validManagers.length === 0) {
            if (onlyMissing) {
                alert('Semua manajer sudah memiliki poin (tidak ada yang kosong)!');
            } else {
                alert('Tidak ada ID Tim FPL yang valid ditemukan.');
            }
            return;
        }

        const msg = onlyMissing 
            ? `Resume sinkronisasi untuk ${validManagers.length} manajer yang poinnya masih kosong?` 
            : `Mulai sinkronisasi paksa untuk SEMUA manajer (${validManagers.length} tim)? Ini memakan waktu cukup lama.`;

        if(!confirm(msg)) {
            return;
        }

        btn.disabled = true;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validManagers.length; i++) {
            const manager = validManagers[i];
            btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Syncing ${i + 1}/${validManagers.length}...`;
            
            let success = false;
            let retries = 0;
            const maxRetries = 2;

            while (!success && retries <= maxRetries) {
                try {
                    const proxies = [
                        'DIRECT', // Coba langsung (Berhasil jika pakai Ekstensi CORS)
                        'https://api.allorigins.win/raw?url=',
                        'https://api.codetabs.com/v1/proxy?quest='
                    ];
                    const proxy = proxies[retries];

                    const urlToFetch = `https://fantasy.premierleague.com/api/entry/${manager.fplId.trim()}/history/`;
                    const fetchUrl = proxy === 'DIRECT' ? urlToFetch : `${proxy}${encodeURIComponent(urlToFetch)}`;
                    
                    const response = await fetch(fetchUrl);
                    
                    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                    
                    const data = await response.json();
                    
                    if (data && data.current) {
                        data.current.forEach(gwData => {
                            const gwIndex = gwData.event - 1;
                            if (gwIndex >= 0 && gwIndex < TOTAL_GW) {
                                manager.scores[gwIndex] = gwData.points - gwData.event_transfers_cost;
                            }
                        });
                        successCount++;
                        success = true;
                    } else {
                        throw new Error('Invalid data format');
                    }
                } catch (err) {
                    console.warn(`Gagal sync ${manager.name} (Percobaan ${retries + 1}):`, err);
                    retries++;
                    if (retries <= maxRetries) {
                        btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Retrying ${manager.name}...`;
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        console.error(`Gagal final untuk ${manager.name} (${manager.fplId})`);
                        failCount++;
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 2500));
        }

        // Apply back to managersData list
        managersData.forEach(m => {
            const updated = validManagers.find(vm => vm.id === m.id);
            if (updated) {
                m.scores = updated.scores;
            }
        });

        localStorage.setItem('fplTourDeFranceData', JSON.stringify(managersData));
        renderAdminTable();
        calculateAndRenderDashboard();
        
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        alert(`Sinkronisasi selesai!\nBerhasil: ${successCount}\nGagal: ${failCount}`);
    }
    
    // Sync Single Manager
    window.syncSingleManager = async function(id, btnElement) {
        // Cari baris DOM
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        if (!tr) return;
        
        // Ambil FPL ID langsung dari input agar tidak perlu save semua tabel dulu
        const fplIdInput = tr.querySelector('.m-fplid-input');
        const fplId = fplIdInput ? fplIdInput.value.trim() : "";
        
        if (!fplId) {
            alert("ID Tim FPL masih kosong!");
            return;
        }

        const managerIndex = managersData.findIndex(m => m.id === id);
        if (managerIndex === -1) return;
        const manager = managersData[managerIndex];
        
        const originalBtnHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="ri-loader-4-line ri-spin"></i>`;
        btnElement.disabled = true;

        let success = false;
        let retries = 0;
        const maxRetries = 2;

        while (!success && retries <= maxRetries) {
            try {
                const proxies = ['DIRECT', 'https://api.allorigins.win/raw?url=', 'https://api.codetabs.com/v1/proxy?quest='];
                const proxy = proxies[retries];
                const urlToFetch = `https://fantasy.premierleague.com/api/entry/${fplId}/history/`;
                const fetchUrl = proxy === 'DIRECT' ? urlToFetch : `${proxy}${encodeURIComponent(urlToFetch)}`;
                
                const response = await fetch(fetchUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                if (data && data.current) {
                    manager.fplId = fplId; // Update FPL ID in memory
                    data.current.forEach(gwData => {
                        const gwIndex = gwData.event - 1;
                        if (gwIndex >= 0 && gwIndex < TOTAL_GW) {
                            manager.scores[gwIndex] = gwData.points - gwData.event_transfers_cost;
                        }
                    });
                    success = true;
                } else {
                    throw new Error('Invalid format');
                }
            } catch (err) {
                console.warn(`Sync failed for ${manager.name}, retry ${retries+1}`, err);
                retries++;
                if (retries <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        btnElement.innerHTML = originalBtnHTML;
        btnElement.disabled = false;

        if (success) {
            // Update input-input di UI tanpa merender ulang seluruh tabel
            for (let i = 0; i < TOTAL_GW; i++) {
                const inputCell = tr.querySelector(`.score-input[data-gw="${i+1}"]`);
                if (inputCell) {
                    inputCell.value = manager.scores[i];
                }
            }
            saveData(); // Sekarang aman untuk save ke localStorage & re-render
        } else {
            alert(`Gagal menarik data untuk FPL ID ${fplId}. Pastikan ID benar dan koneksi stabil.`);
        }
    };

    // Bind Sync Buttons
    document.getElementById('btn-auto-sync').addEventListener('click', () => performSync('btn-auto-sync', false));
    document.getElementById('btn-sync-zero').addEventListener('click', () => performSync('btn-sync-zero', true));
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
