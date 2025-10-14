/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Global libraries (html2canvas, jspdf, Chart, XLSX) are loaded via script tags in index.html

document.addEventListener('DOMContentLoaded', function () {
    const STORAGE_KEY = 'fingerprintReportAppState';
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const state = {
        sekolah: {
            namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
            namaYayasan: '',
            nama: 'NAMA SEKOLAH ANDA',
            akreditasi: 'A',
            alamat: 'Jl. Pendidikan No. 1',
            desa: 'Desa/Kelurahan',
            kecamatan: 'Kecamatan',
            kabupaten: 'Kabupaten',
            provinsi: 'Provinsi',
            kodePos: '12345',
            kontak: '081234567890',
            faksimile: '',
            email: 'email@sekolah.sch.id',
            website: 'https://sekolah.sch.id',
            kepsek: 'NAMA KEPALA SEKOLAH, S.Pd., M.Pd.',
            nip: '197001011995121001',
            pengawas: 'NAMA PENGAWAS, S.Pd., M.Pd.',
            nipPengawas: '197101011996121001',
            logo: ''
        },
        pengaturanKerja: {
            hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
            jamMasukReguler: '07:00',
            jamPulangReguler: '15:00',
            jamMasukHonorer: '07:30',
            jamPulangHonorer: '14:00',
            toleransi: 15
        },
        guru: [
            { id: '101', nip: '198501012010011001', nama: 'Dr. Budi Santoso, M.Kom.', jabatan: 'Guru TIK', jenisGuru: 'Reguler/PNS' },
            { id: '102', nip: '199002022015022002', nama: 'Citra Lestari, S.Pd.', jabatan: 'Guru Bahasa Indonesia', jenisGuru: 'Reguler/PNS' },
            { id: '103', nip: '', nama: 'Andi Pratama', jabatan: 'Guru Olahraga', jenisGuru: 'Honorer' }
        ],
        absensi: [],
        kehadiranOverrides: {},
        ui: {
            guru: { currentPage: 1, searchQuery: '', selectedIds: new Set() },
            cetak: { selectedIds: [] },
            cetakV2: { selectedIds: [] },
            cetakV3: { selectedIds: [] },
            cetakV4: { selectedIds: [] }
        },
    };
    let kehadiranChart = null;

    // --- LOCAL STORAGE FUNCTIONS ---
    function saveState() {
        try {
            const dataToSave = {
                sekolah: state.sekolah,
                pengaturanKerja: state.pengaturanKerja,
                guru: state.guru,
                absensi: state.absensi,
                kehadiranOverrides: state.kehadiranOverrides
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Error saving state to localStorage", e);
            showCustomAlert('error', 'Gagal Menyimpan', 'Tidak dapat menyimpan data ke penyimpanan lokal. Perubahan mungkin tidak akan tersimpan.');
        }
    }

    function loadState() {
        try {
            const savedStateJSON = localStorage.getItem(STORAGE_KEY);
            if (savedStateJSON) {
                const savedData = JSON.parse(savedStateJSON);
                if (savedData.sekolah) state.sekolah = { ...state.sekolah, ...savedData.sekolah };
                if (savedData.pengaturanKerja) state.pengaturanKerja = { ...state.pengaturanKerja, ...savedData.pengaturanKerja };
                if (savedData.guru) state.guru = savedData.guru;
                if (savedData.absensi) state.absensi = savedData.absensi;
                if (savedData.kehadiranOverrides) state.kehadiranOverrides = savedData.kehadiranOverrides;
            }
        } catch (e) {
            console.error("Error loading state from localStorage", e);
             showCustomAlert('error', 'Gagal Memuat Data', 'Data yang tersimpan sebelumnya rusak dan tidak dapat dimuat.');
        }
    }

    const ICONS = {
        ok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        cancel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        confirm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    };

    // --- DOM Elements ---
    const body = document.body;
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('main section');
    const nav = document.querySelector('nav');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const headerLogo = document.getElementById('header-logo');
    const headerSchoolName = document.getElementById('header-school-name');
    const favicon = document.getElementById('favicon');
    const LOGO_PLACEHOLDER = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23adb5bd' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'%3e%3c/path%3e%3cpolyline points='9 22 9 12 15 12 15 22'%3e%3c/polyline%3e%3c/svg%3e`;
    
    // --- CUSTOM ALERT ---
    const alertBackdrop = document.getElementById('custom-alert-backdrop');
    const alertModal = document.getElementById('custom-alert-modal');
    const alertIcon = document.getElementById('custom-alert-icon');
    const alertTitle = document.getElementById('custom-alert-title');
    const alertMessage = document.getElementById('custom-alert-message');
    const alertButtons = document.getElementById('custom-alert-buttons');

    const alertIcons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        confirm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="9" x2="12" y2="15"></line></svg>`,
        loading: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`
    };

    function showCustomAlert(type, title, message) {
        alertModal.className = 'custom-alert-modal ' + type;
        alertIcon.innerHTML = alertIcons[type];
        alertTitle.textContent = title;
        alertMessage.innerHTML = message.replace(/\n/g, '<br>'); // Allow newlines in message

        if (type === 'loading') {
            alertButtons.innerHTML = '';
        } else {
            alertButtons.innerHTML = `<button class="btn btn-primary">${ICONS.ok}<span>OK</span></button>`;
            alertButtons.querySelector('button').onclick = () => hideCustomAlert();
        }
        
        alertBackdrop.classList.remove('hidden');
        setTimeout(() => alertBackdrop.classList.add('visible'), 10);
    }

    function showCustomConfirm(title, message, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal') {
        return new Promise(resolve => {
            alertModal.className = 'custom-alert-modal confirm';
            alertIcon.innerHTML = alertIcons.warning;
            alertTitle.textContent = title;
            alertMessage.innerHTML = message.replace(/\n/g, '<br>');
            alertButtons.innerHTML = `
                <button class="btn btn-secondary">${ICONS.cancel}<span>${cancelText}</span></button>
                <button class="btn btn-confirm-primary">${ICONS.confirm}<span>${confirmText}</span></button>
            `;
            
            alertBackdrop.classList.remove('hidden');
            setTimeout(() => alertBackdrop.classList.add('visible'), 10);
            
            const [cancelBtn, confirmBtn] = alertButtons.querySelectorAll('button');
            
            confirmBtn.onclick = () => {
                hideCustomAlert();
                resolve(true);
            };
            cancelBtn.onclick = () => {
                hideCustomAlert();
                resolve(false);
            };
        });
    }

    function hideCustomAlert() {
        alertBackdrop.classList.remove('visible');
        setTimeout(() => alertBackdrop.classList.add('hidden'), 200);
    }
    
    // --- UTILITY FUNCTIONS ---
    function renderPaginatedTable({ container, paginationContainer, items, uiState, headers, itemName, itemsPerPage, rowRenderer }) {
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        let currentPage = uiState.currentPage || 1;
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            uiState.currentPage = totalPages;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = items.slice(start, end);

        const tableHeaders = `
            <thead>
                <tr>
                    <th class="checkbox-col"><input type="checkbox" id="select-all-${itemName}"></th>
                    ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
        `;

        const tableBody = `<tbody>${paginatedItems.map((item, index) => rowRenderer(item, start + index)).join('')}</tbody>`;

        container.innerHTML = `
            <table class="data-table responsive-table">
                ${tableHeaders}
                ${tableBody}
            </table>
        `;
        
        // Pagination rendering
        let paginationHTML = '';
        if (totalPages > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
            paginationHTML += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lsaquo;</button>`;

            const pagesToShow = 5;
            let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
            if (endPage - startPage + 1 < pagesToShow) {
                startPage = Math.max(1, endPage - pagesToShow + 1);
            }

            if (startPage > 1) {
                paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
                if (startPage > 2) {
                    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                }
                paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            paginationHTML += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>`;
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
        }
        
        paginationContainer.innerHTML = `
            <div class="pagination-summary">Menampilkan ${paginatedItems.length > 0 ? start + 1 : 0}-${start + paginatedItems.length} dari ${totalItems} ${itemName}</div>
            <div class="pagination-nav">${paginationHTML}</div>
        `;

        // Event listeners
        paginationContainer.querySelectorAll('.pagination-btn').forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.dataset.page, 10);
                if (page && page !== uiState.currentPage) {
                    uiState.currentPage = page;
                    renderGuruList(); // Specific to guru page
                }
            });
        });

        // Add event listener for the "select all" checkbox
        const selectAllCheckbox = container.querySelector(`#select-all-${itemName}`);
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                // Select/deselect all items on the CURRENT page
                const visibleCheckboxes = container.querySelectorAll(`.${itemName}-checkbox`);
                visibleCheckboxes.forEach(checkbox => {
                    const id = checkbox.dataset.id;
                    if (selectAllCheckbox.checked) {
                        state.ui.guru.selectedIds.add(id);
                    } else {
                        state.ui.guru.selectedIds.delete(id);
                    }
                });
                renderGuruList(); // re-render to update row styles and checkbox states
            });
            
            // Determine state of "select all" checkbox
            const allVisibleSelected = paginatedItems.length > 0 && paginatedItems.every(item => state.ui.guru.selectedIds.has(item.id));
            selectAllCheckbox.checked = allVisibleSelected;
        }
    }
    function handleImageUpload(inputElement, previewElement, callback) {
        inputElement.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    previewElement.src = e.target.result;
                    if (callback) callback(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function minutesToHHMM(totalMinutes) {
        if (totalMinutes === '-' || totalMinutes <= 0 || !totalMinutes) {
            return '-';
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // FIX: Define the missing processAbsensi function.
    function processAbsensi(absensiData, guruIds, startDate, endDate) {
        const { pengaturanKerja, guru: allGuru, kehadiranOverrides } = state;

        const result = {};

        const timeToMinutes = (timeStr) => {
            if (!timeStr || timeStr === '-') return null;
            try {
                const [hours, minutes] = timeStr.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return null;
                return hours * 60 + minutes;
            } catch (e) {
                return null;
            }
        };

        guruIds.forEach(id => {
            const guru = allGuru.find(g => g.id === id);
            if (!guru) return;

            const isHonorer = guru.jenisGuru === 'Honorer';
            const jamMasukKerja = isHonorer ? pengaturanKerja.jamMasukHonorer : pengaturanKerja.jamMasukReguler;
            const jamPulangKerja = isHonorer ? pengaturanKerja.jamPulangHonorer : pengaturanKerja.jamPulangReguler;

            const jamMasukKerjaMin = timeToMinutes(jamMasukKerja);
            const jamPulangKerjaMin = timeToMinutes(jamPulangKerja);
            const toleransiMin = pengaturanKerja.toleransi;

            const guruData = {
                days: {},
                summary: {
                    hadir: 0,
                    terlambat: 0,
                    absen: 0,
                    totalTerlambatMenit: 0,
                    totalLemburMenit: 0,
                    totalPlgCptMenit: 0,
                }
            };

            const absensiGuru = absensiData.filter(a => a.id === id);

            for (let d = new Date(startDate.getTime()); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                const dateStr = d.toISOString().slice(0, 10);
                const dayName = HARI[d.getUTCDay()];
                const isHariKerja = pengaturanKerja.hariKerja.includes(dayName);

                const dayData = {
                    jamKerjaMasuk: '-',
                    jamKerjaPulang: '-',
                    scanMasuk: '-',
                    scanKeluar: '-',
                    terlambat: '-',
                    plgCpt: '-',
                    lembur: '-',
                    jmlHadir: '-',
                    keterangan: 'Hari Libur'
                };
                
                const overrideKey = `${id}-${dateStr}`;
                const override = kehadiranOverrides[overrideKey];

                if (isHariKerja) {
                    dayData.jamKerjaMasuk = jamMasukKerja;
                    dayData.jamKerjaPulang = jamPulangKerja;
                    dayData.keterangan = 'Absen';

                    if (override && override.keterangan) {
                        dayData.keterangan = override.keterangan;
                    } else {
                        let scanMasuk = null;
                        let scanKeluar = null;

                        if (override) {
                            if (override.masuk) scanMasuk = override.masuk;
                            if (override.pulang) scanKeluar = override.pulang;
                        } else {
                            const logsForDay = absensiGuru.filter(a => a.timestamp.startsWith(dateStr));
                            if (logsForDay.length > 0) {
                                const times = logsForDay.map(log => log.timestamp.slice(11, 16)).sort();
                                scanMasuk = times[0];
                                if (times.length > 1) {
                                    scanKeluar = times[times.length - 1];
                                }
                            }
                        }
                        
                        if (scanMasuk) dayData.scanMasuk = scanMasuk;
                        if (scanKeluar) dayData.scanKeluar = scanKeluar;

                        const scanMasukMin = timeToMinutes(scanMasuk);
                        const scanKeluarMin = timeToMinutes(scanKeluar);
                        
                        if (scanMasukMin !== null && jamMasukKerjaMin !== null) {
                            dayData.keterangan = 'Hadir';
                            dayData.jmlHadir = '1';

                            const keterlambatan = scanMasukMin - jamMasukKerjaMin;
                            if (keterlambatan > toleransiMin) {
                                dayData.terlambat = minutesToHHMM(keterlambatan);
                                dayData.keterangan = 'Terlambat';
                                guruData.summary.terlambat++;
                                guruData.summary.totalTerlambatMenit += keterlambatan;
                            } else {
                                dayData.terlambat = '00:00';
                            }
                            guruData.summary.hadir++;
                        }

                        if (scanKeluarMin !== null && jamPulangKerjaMin !== null) {
                            const pulangCepat = jamPulangKerjaMin - scanKeluarMin;
                            if (pulangCepat > 0) {
                                dayData.plgCpt = minutesToHHMM(pulangCepat);
                                guruData.summary.totalPlgCptMenit += pulangCepat;
                            } else {
                                dayData.plgCpt = '00:00';
                            }

                            const lembur = scanKeluarMin - jamPulangKerjaMin;
                            if (lembur > 0) {
                                dayData.lembur = minutesToHHMM(lembur);
                                guruData.summary.totalLemburMenit += lembur;
                            } else {
                                dayData.lembur = '00:00';
                            }
                        }
                    }
                    
                    if (dayData.keterangan === 'Absen') {
                       guruData.summary.absen++;
                    }
                } else { // Not a working day, but check for overrides (overtime etc)
                    if (override) {
                         if (override.keterangan) {
                            dayData.keterangan = override.keterangan;
                         } else if (override.masuk || override.pulang) {
                             dayData.keterangan = "Hadir (Lembur)";
                         }
                        if (override.masuk) dayData.scanMasuk = override.masuk;
                        if (override.pulang) dayData.scanKeluar = override.pulang;
                    }
                }
                guruData.days[dateStr] = dayData;
            }
            result[id] = guruData;
        });

        return result;
    }

    // --- NAVIGATION ---
    function showPage(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        navButtons.forEach(b => b.classList.remove('active'));

        document.getElementById(pageId).classList.add('active');
        const navBtnId = pageId.replace('page-', 'btn-');
        const navBtn = document.getElementById(navBtnId);
        if (navBtn) navBtn.classList.add('active');
        
        // Refresh data on page view
        const pageRenderers = {
            'page-dashboard': renderDashboard,
            'page-guru': renderGuruPage,
            'page-absensi': renderAbsensiPage,
            'page-identitas': renderIdentitasPage,
            'page-jadwal': renderJadwalPage,
            'page-cetak': renderCetakPage,
            'page-cetak-v2': renderCetakPageV2,
            'page-cetak-v3': renderCetakPageV3,
            'page-cetak-v4': renderCetakPageV4,
            'page-backup': () => {}, // No specific render needed for backup page
        };
        if (pageRenderers[pageId]) pageRenderers[pageId]();
    }
    
    // --- UI State Update ---
    function updateSharedUI() {
        const logoSrc = state.sekolah.logo || LOGO_PLACEHOLDER;
        headerLogo.src = logoSrc;
        headerSchoolName.textContent = state.sekolah.nama || 'Nama Sekolah Belum Diatur';
        const defaultFavicon = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 26'%3e%3ccircle cx='12' cy='12' r='12' fill='%23047857'/%3e%3cpath d='M12 12h.01M8 12h.01M16 12h.01M5 12a7 7 0 0 1 7-7h0a7 7 0 0 1 7 7v3.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 15.5V12z' stroke='white' stroke-width='2' fill='none'/%3e%3c/svg%3e";
        favicon.href = state.sekolah.logo || defaultFavicon;
    }

    // --- DASHBOARD ---
    function renderDashboard() {
        // Stats
        document.getElementById('stat-total-guru').textContent = state.guru.length.toString();

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        // Calculation for Hari Kerja
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dayName = HARI[currentDate.getDay()];
            if (state.pengaturanKerja.hariKerja.includes(dayName)) {
                workingDays++;
            }
        }
        document.getElementById('stat-hari-kerja').textContent = workingDays.toString();

        // Calculation for Log Absensi
        const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const logsThisMonth = state.absensi.filter(log => log.timestamp.startsWith(currentMonthStr)).length;
        document.getElementById('stat-log-absensi').textContent = logsThisMonth.toString();

        // Existing calculations
        const { hadirCount } = getDailyStats(today);
        document.getElementById('stat-hadir-hari-ini').textContent = `${hadirCount}/${state.guru.length}`;
        
        const { terlambatCount, absenCount } = getMonthlyStats();
        document.getElementById('stat-terlambat-bulan-ini').textContent = terlambatCount.toString();
        document.getElementById('stat-absen-bulan-ini').textContent = absenCount.toString();

        // Chart
        const chartData = getWeeklyAttendanceData();
        const ctx = document.getElementById('kehadiranChart').getContext('2d');
        if (kehadiranChart) kehadiranChart.destroy();
        
        kehadiranChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: '% Kehadiran',
                    data: chartData.data,
                    backgroundColor: 'rgba(4, 120, 87, 0.6)',
                    borderColor: 'rgba(4, 120, 87, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: value => value + '%' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function getDailyStats(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const startDate = new Date(Date.UTC(year, month, day));
        const endDate = new Date(Date.UTC(year, month, day));
        
        const processedData = processAbsensi(state.absensi, state.guru.map(g => g.id), startDate, endDate);
        let hadirCount = 0;
        if (processedData) {
            Object.values(processedData).forEach(guruData => {
                if (guruData && guruData.days) {
                    Object.values(guruData.days).forEach(dayData => {
                        if (dayData.keterangan === 'Hadir' || dayData.keterangan === 'Terlambat') {
                            hadirCount++;
                        }
                    });
                }
            });
        }
        return { hadirCount };
    }

    function getMonthlyStats() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const firstDayUTC = new Date(Date.UTC(year, month, 1));
        const lastDayUTC = new Date(Date.UTC(year, month, lastDay));

        let terlambatCount = 0;
        let absenCount = 0;
        const processedData = processAbsensi(state.absensi, state.guru.map(g => g.id), firstDayUTC, lastDayUTC);
        
        if (processedData) {
            Object.values(processedData).forEach(guruData => {
                 if (guruData && guruData.summary) {
                    absenCount += guruData.summary.absen;
                    terlambatCount += guruData.summary.terlambat;
                }
            });
        }
        return { terlambatCount, absenCount };
    }

    function getWeeklyAttendanceData() {
        const labels = [];
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dayName = HARI[date.getDay()];
            labels.push(`${dayName}, ${date.getDate()}`);

            if (!state.pengaturanKerja.hariKerja.includes(dayName) || state.guru.length === 0) {
                data.push(0);
                continue;
            }
            
            const { hadirCount } = getDailyStats(date);
            const percentage = (hadirCount / state.guru.length) * 100;
            data.push(percentage.toFixed(1));
        }
        return { labels, data };
    }

    // --- DATA GURU PAGE ---
    function renderGuruPage() {
        renderGuruList();
    }

    function renderGuruList() {
        const container = document.getElementById('daftar-guru-container');
        const paginationContainer = document.getElementById('guru-pagination-controls');
        const query = state.ui.guru.searchQuery.toLowerCase();
        
        const filteredGuru = state.guru.filter(g => 
            g.nama.toLowerCase().includes(query) || g.id.toLowerCase().includes(query) || (g.nip && g.nip.toLowerCase().includes(query))
        );

        renderPaginatedTable({
            container,
            paginationContainer,
            items: filteredGuru,
            uiState: state.ui.guru,
            headers: ['No.', 'ID Unik', 'Nama Lengkap', 'Jenis Guru', 'Aksi'],
            itemName: 'guru',
            itemsPerPage: 5,
            rowRenderer: (guru, index) => {
                const isSelected = state.ui.guru.selectedIds.has(guru.id);
                return `
                    <tr class="${isSelected ? 'selected' : ''}" data-id="${guru.id}">
                        <td class="checkbox-col"><input type="checkbox" class="guru-checkbox" data-id="${guru.id}" ${isSelected ? 'checked' : ''}></td>
                        <td data-label="No.">${index + 1}.</td>
                        <td data-label="ID Unik">${guru.id}</td>
                        <td data-label="Nama Lengkap">${guru.nama}</td>
                        <td data-label="Jenis Guru">${guru.jenisGuru}</td>
                        <td data-label="Aksi">
                            <button class="btn-edit btn" data-id="${guru.id}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
							Edit
							</button>
                            <button class="btn-delete btn" data-id="${guru.id}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
							Hapus
							</button>
                        </td>
                    </tr>
                `;
            }
        });
        updateBulkActionsGuru();
    }

    function openGuruModal(guruId = null) {
        const modal = document.getElementById('guru-modal');
        const form = document.getElementById('form-guru');
        const idUnikInput = document.getElementById('guru-id-unik');
        form.reset();
        document.getElementById('guru-id-hidden').value = '';
        
        if (guruId) {
            const guru = state.guru.find(g => g.id === guruId);
            if (guru) {
                document.getElementById('guru-modal-title').textContent = 'Edit Data Guru';
                document.getElementById('guru-id-hidden').value = guru.id;
                idUnikInput.value = guru.id;
                idUnikInput.readOnly = true; // Prevent editing primary key
                document.getElementById('guru-nip').value = guru.nip;
                document.getElementById('guru-nama').value = guru.nama;
                document.getElementById('guru-jabatan').value = guru.jabatan;
                document.getElementById('guru-jenis').value = guru.jenisGuru;
            }
        } else {
            document.getElementById('guru-modal-title').textContent = 'Input Guru Baru';
            idUnikInput.readOnly = false;
        }
        modal.classList.remove('hidden');
    }

    function saveGuru() {
        const originalId = document.getElementById('guru-id-hidden').value;
        const idUnik = document.getElementById('guru-id-unik').value.trim();
        const nip = document.getElementById('guru-nip').value.trim();
        const nama = document.getElementById('guru-nama').value.trim();
        const jabatan = document.getElementById('guru-jabatan').value.trim();
        const jenisGuru = document.getElementById('guru-jenis').value;

        if (!idUnik || !nama) {
            showCustomAlert('error', 'Data Tidak Lengkap', 'No. ID Unik dan Nama Lengkap wajib diisi.');
            return;
        }

        const isEditing = !!originalId;
        const isIdDuplicate = state.guru.some(g => g.id === idUnik && g.id !== originalId);
        if (isIdDuplicate) {
            showCustomAlert('error', 'ID Duplikat', `Guru dengan No. ID Unik ${idUnik} sudah ada.`);
            return;
        }
        
        if (isEditing) {
            const guruIndex = state.guru.findIndex(g => g.id === originalId);
            if (guruIndex > -1) {
                state.guru[guruIndex] = { id: idUnik, nip, nama, jabatan, jenisGuru };
            }
        } else {
            state.guru.push({ id: idUnik, nip, nama, jabatan, jenisGuru });
        }
        
        saveState();
        renderGuruPage();
        renderDashboard();
        document.getElementById('guru-modal').classList.add('hidden');
        showCustomAlert('success', 'Berhasil', `Data guru telah ${isEditing ? 'diperbarui' : 'disimpan'}.`);
    }

    function deleteGuru(guruId) {
        state.guru = state.guru.filter(g => g.id !== guruId);
        state.ui.guru.selectedIds.delete(guruId);
        saveState();
        renderGuruPage();
        renderDashboard();
    }

    function updateBulkActionsGuru() {
        const container = document.getElementById('bulk-actions-guru-container');
        const deleteBtn = document.getElementById('btn-delete-selected-guru');
        const printBtn = document.getElementById('btn-print-selected-guru');
        const count = state.ui.guru.selectedIds.size;
        
        if (count > 0) {
            deleteBtn.querySelector('span').textContent = `Hapus (${count})`;
            printBtn.classList.add('hidden'); // Hide print button
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
            printBtn.classList.remove('hidden'); // Show it again when container is hidden
        }
    }

    // --- SET MANUAL KEHADIRAN PAGE ---
    function renderAbsensiPage() {
        const guruSelect = document.getElementById('manual-absensi-guru');
        const importButton = document.getElementById('btn-import-absensi');

        if (state.guru.length > 0) {
            importButton.classList.remove('hidden');
        } else {
            importButton.classList.add('hidden');
        }

        guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
            state.guru.map(g => `<option value="${g.id}">${g.nama} (${g.id})</option>`).join('');

        const now = new Date();
        const monthInput = document.getElementById('manual-absensi-bulan');
        if (!monthInput.value) {
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        document.getElementById('manual-absensi-form-container').innerHTML = `<p style="text-align:center; color: var(--secondary-color); padding-top: 5rem;">Pilih guru dan periode, lalu klik "Tampilkan" untuk mengatur kehadiran manual.</p>`;
    }

    function generateManualAbsensiForm(guruId, monthYear) {
        const container = document.getElementById('manual-absensi-form-container');
        const [year, month] = monthYear.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const guru = state.guru.find(g => g.id === guruId);
        if (!guru) {
            container.innerHTML = `<p style="text-align:center; color: var(--secondary-color);">Guru dengan ID ${guruId} tidak ditemukan.</p>`;
            return;
        }

        // --- Live Absensi Section ---
        let liveAbsensiHtml = '';
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        
        // Only show live attendance feature if viewing the current month
        if (year === now.getFullYear() && month === now.getMonth() + 1) {
            const overrideKey = `${guruId}-${todayStr}`;
            const overrideToday = state.kehadiranOverrides[overrideKey];
            const jamSekarang = now.getHours();
            const menitSekarang = now.getMinutes();

            let isMasukTime = false;
            if (jamSekarang < 12) { // 00:00 - 11:59
                isMasukTime = true;
            } else if (jamSekarang === 12 && menitSekarang === 0) { // Tepat 12:00
                isMasukTime = true;
            }

            let buttonHtml = '';
            let statusHtml = '';

            if (overrideToday?.masuk) {
                 statusHtml += `<p style="margin:0; font-size: 0.85rem; color: var(--success-color);">✔️ Absen Masuk: <strong>${overrideToday.masuk}</strong></p>`;
            }
             if (overrideToday?.pulang) {
                 statusHtml += `<p style="margin:0; font-size: 0.85rem; color: var(--success-color);">✔️ Absen Pulang: <strong>${overrideToday.pulang}</strong></p>`;
            }

            if (isMasukTime) { // Mode Absen Masuk (00:00 - 12:00)
                if (overrideToday?.masuk) {
                    buttonHtml = `<button class="btn btn-secondary" disabled>Sudah Absen Masuk</button>`;
                } else {
                    buttonHtml = `<button id="btn-live-absensi" data-action="masuk" class="btn btn-primary">Absen Masuk Sekarang</button>`;
                }
            } else { // Mode Absen Pulang (12:01 - 23:59)
                if (overrideToday?.pulang) {
                    buttonHtml = `<button class="btn btn-secondary" disabled>Sudah Absen Pulang</button>`;
                } else {
                    buttonHtml = `<button id="btn-live-absensi" data-action="pulang" class="btn btn-success">Absen Pulang Sekarang</button>`;
                }
            }
            
            liveAbsensiHtml = `
                <div style="border: 1px solid var(--border-color); border-left: 4px solid var(--info-color); padding: 1rem; border-radius: 4px; background: #f8f9fa;">
                    <h4 style="margin-top: 0; margin-bottom: 0.75rem; font-size: 1rem;">Absensi Hari Ini (${now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})})</h4>
                    ${buttonHtml}
                    <div style="margin-top: 0.75rem;">${statusHtml}</div>
                </div>
            `;
        }

        const guruInfoHtml = `
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
                <div class="settings-section" style="padding: 1rem 1.5rem; border-left: 4px solid var(--primary-color); flex: 1; min-width: 300px;">
                    <div style="font-size: 0.95rem; line-height: 1.5;">
                        <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">No. ID</strong>: ${guru.id}</div>
                        <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">Nama Guru</strong>: ${guru.nama}</div>
                        <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">Jenis Guru</strong>: ${guru.jenisGuru}</div>
                    </div>
                </div>
                ${liveAbsensiHtml}
            </div>
        `;
        
        let rowsHtml = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day));
            const dateStr = currentDate.toISOString().slice(0, 10);
            const formattedDate = currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
            
            const dayName = HARI[currentDate.getUTCDay()];
            const isHariKerja = state.pengaturanKerja.hariKerja.includes(dayName);

            let rowAttributes = '';
            let masukInput, pulangInput, keteranganInput, aksiInput;

            const timeInputHTML = (value, disabled = false, ariaLabel = '') => `
                <div class="time-input-container">
                    <input type="text" class="time-input-display manual-jam" value="${value}" readonly ${disabled ? 'disabled' : ''} placeholder="--:--">
                    <button type="button" class="time-picker-trigger" aria-label="${ariaLabel}" ${disabled ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </button>
                </div>
            `;

            if (!isHariKerja) {
                rowAttributes = 'class="holiday-row"';
                masukInput = timeInputHTML('', true);
                pulangInput = timeInputHTML('', true);
                keteranganInput = `<textarea class="manual-keterangan manual-keterangan-textarea" rows="1" disabled>Hari Libur Sekolah</textarea>`;
                aksiInput = '';
            } else {
                const overrideKey = `${guruId}-${dateStr}`;
                const existingOverride = state.kehadiranOverrides[overrideKey] || { keterangan: '', masuk: '', pulang: '' };
                const isTimeDisabled = !!existingOverride.keterangan;
                if (isTimeDisabled) {
                    rowAttributes = 'class="holiday-row"';
                }
                
                masukInput = timeInputHTML(existingOverride.masuk || '', isTimeDisabled, `Pilih jam masuk untuk tanggal ${day}`);
                pulangInput = timeInputHTML(existingOverride.pulang || '', isTimeDisabled, `Pilih jam pulang untuk tanggal ${day}`);
                keteranganInput = `<textarea class="manual-keterangan manual-keterangan-textarea" rows="1" placeholder="Sakit, Izin, Cuti...">${existingOverride.keterangan || ''}</textarea>`;
                aksiInput = `<button class="btn btn-reset-harian" title="Reset Isian Hari Ini">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                             </button>`;
            }

            rowsHtml += `
                <tr data-date="${dateStr}" ${rowAttributes}>
                    <td data-label="No.">${day}.</td>
                    <td data-label="Tanggal">${formattedDate}</td>
                    <td data-label="Jam Masuk">${masukInput}</td>
                    <td data-label="Jam Pulang">${pulangInput}</td>
                    <td data-label="Keterangan">${keteranganInput}</td>
                    <td data-label="Aksi" style="text-align: center;">${aksiInput}</td>
                </tr>
            `;
        }
        
        container.innerHTML = guruInfoHtml + `
            <div class="data-table-container" style="margin-top:0;">
                <table class="data-table responsive-table-manual">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Tanggal</th>
                            <th>Jam Masuk</th>
                            <th>Jam Pulang</th>
                            <th>Keterangan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            <div class="action-buttons-container" style="justify-content: flex-end; margin-top: 1.5rem; gap: 0.5rem;">
                <button id="btn-reset-manual-absensi" class="btn btn-orange">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    <span>Reset Isian</span>
                </button>
                <button id="btn-simpan-manual-absensi" class="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span>Simpan Perubahan</span>
                </button>
            </div>
        `;
    }

    // --- PENGATURAN PAGES ---
    function renderIdentitasPage() {
        const s = state.sekolah;
        document.getElementById('nama-dinas').value = s.namaDinas || '';
        document.getElementById('nama-yayasan').value = s.namaYayasan || '';
        document.getElementById('nama-sekolah').value = s.nama;
        document.getElementById('akreditasi-sekolah').value = s.akreditasi || '';
        document.getElementById('alamat-sekolah').value = s.alamat;
        document.getElementById('desa').value = s.desa || '';
        document.getElementById('kecamatan').value = s.kecamatan;
        document.getElementById('kabupaten').value = s.kabupaten || '';
        document.getElementById('provinsi').value = s.provinsi || '';
        document.getElementById('kode-pos').value = s.kodePos || '';
        document.getElementById('kontak').value = s.kontak || '';
        document.getElementById('faksimile').value = s.faksimile || '';
        document.getElementById('email').value = s.email || '';
        document.getElementById('website').value = s.website || '';
        document.getElementById('kepala-sekolah').value = s.kepsek;
        document.getElementById('nip-kepsek').value = s.nip;
        document.getElementById('nama-pengawas').value = s.pengawas;
        document.getElementById('nip-pengawas').value = s.nipPengawas;
        document.getElementById('logo-preview').src = s.logo || LOGO_PLACEHOLDER;
    }

    function renderJadwalPage() {
        const p = state.pengaturanKerja;
        const hariContainer = document.getElementById('hari-kerja-container');
        hariContainer.innerHTML = HARI.slice(1).concat(HARI[0]).map(hari => `
            <label>
                <input type="checkbox" value="${hari}" ${p.hariKerja.includes(hari) ? 'checked' : ''}>
                ${hari}
            </label>
        `).join('');
        document.getElementById('jam-masuk-reguler').value = p.jamMasukReguler;
        document.getElementById('jam-pulang-reguler').value = p.jamPulangReguler;
        document.getElementById('jam-masuk-honorer').value = p.jamMasukHonorer;
        document.getElementById('jam-pulang-honorer').value = p.jamPulangHonorer;
        document.getElementById('toleransi-terlambat').value = p.toleransi.toString();
    }
    
    function saveIdentitas() {
        state.sekolah.namaDinas = document.getElementById('nama-dinas').value.trim();
        state.sekolah.namaYayasan = document.getElementById('nama-yayasan').value.trim();
        state.sekolah.nama = document.getElementById('nama-sekolah').value.trim();
        state.sekolah.akreditasi = document.getElementById('akreditasi-sekolah').value.trim();
        state.sekolah.alamat = document.getElementById('alamat-sekolah').value.trim();
        state.sekolah.desa = document.getElementById('desa').value.trim();
        state.sekolah.kecamatan = document.getElementById('kecamatan').value.trim();
        state.sekolah.kabupaten = document.getElementById('kabupaten').value.trim();
        state.sekolah.provinsi = document.getElementById('provinsi').value.trim();
        state.sekolah.kodePos = document.getElementById('kode-pos').value.trim();
        state.sekolah.kontak = document.getElementById('kontak').value.trim();
        state.sekolah.faksimile = document.getElementById('faksimile').value.trim();
        state.sekolah.email = document.getElementById('email').value.trim();
        state.sekolah.website = document.getElementById('website').value.trim();
        state.sekolah.kepsek = document.getElementById('kepala-sekolah').value.trim();
        state.sekolah.nip = document.getElementById('nip-kepsek').value.trim();
        state.sekolah.pengawas = document.getElementById('nama-pengawas').value.trim();
        state.sekolah.nipPengawas = document.getElementById('nip-pengawas').value.trim();
        const logoPreviewSrc = document.getElementById('logo-preview').src;
        if (logoPreviewSrc !== LOGO_PLACEHOLDER) {
            state.sekolah.logo = logoPreviewSrc;
        }
        
        saveState();
        updateSharedUI();
        showCustomAlert('success', 'Berhasil', 'Identitas sekolah telah disimpan.');
    }

    function saveJadwal() {
        state.pengaturanKerja.hariKerja = Array.from(document.querySelectorAll('#hari-kerja-container input:checked')).map(cb => cb.value);
        state.pengaturanKerja.jamMasukReguler = document.getElementById('jam-masuk-reguler').value;
        state.pengaturanKerja.jamPulangReguler = document.getElementById('jam-pulang-reguler').value;
        state.pengaturanKerja.jamMasukHonorer = document.getElementById('jam-masuk-honorer').value;
        state.pengaturanKerja.jamPulangHonorer = document.getElementById('jam-pulang-honorer').value;
        state.pengaturanKerja.toleransi = parseInt(document.getElementById('toleransi-terlambat').value, 10) || 0;
        
        saveState();
        showCustomAlert('success', 'Berhasil', 'Jadwal & jam kerja telah disimpan.');
    }
    
    function adjustKeteranganFontSize() {
        const keteranganCells = document.querySelectorAll('.kolom-keterangan');
        keteranganCells.forEach(cell => {
            const htmlCell = cell;
            const text = htmlCell.dataset.keterangan || '';
            if (text.length > 20) {
                htmlCell.style.fontSize = '7pt';
            } else if (text.length > 15) {
                htmlCell.style.fontSize = '8pt';
            } else {
                htmlCell.style.fontSize = ''; // Use CSS default
            }
        });
    }

    // --- CETAK LAPORAN PAGE ---
    function renderCetakPage() {
        const multiPrintIds = state.ui.cetak.selectedIds;
        const controlsContainer = document.getElementById('cetak-controls-container');
        const multiPrintStatusContainer = document.getElementById('multi-print-status');
        const previewWrapper = document.getElementById('laporan-pratinau-wrapper');
        
        if (multiPrintIds && multiPrintIds.length > 0) {
            controlsContainer.classList.add('hidden');
            multiPrintStatusContainer.classList.remove('hidden');
            document.getElementById('multi-print-message').textContent = `Menyiapkan laporan untuk ${multiPrintIds.length} guru terpilih...`;
            previewWrapper.innerHTML = '';
            tampilkanLaporanMulti();
        } else {
            controlsContainer.classList.remove('hidden');
            multiPrintStatusContainer.classList.add('hidden');
            const guruSelect = document.getElementById('cetak-pilih-guru');
            guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
                state.guru.map(g => `<option value="${g.id}">${g.nama} (${g.id})</option>`).join('');
            
            const now = new Date();
            const monthInput = document.getElementById('cetak-pilih-bulan');
            if (!monthInput.value) {
                monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            previewWrapper.innerHTML = `<p style="text-align:center; color: var(--secondary-color); padding-top: 5rem;">Pilih guru dan periode, lalu klik "Tampilkan" untuk melihat pratinjau laporan.</p>`;
            document.getElementById('btn-print-laporan').classList.add('hidden');
        }
    }
    
    function tampilkanLaporan() {
        const id = document.getElementById('cetak-pilih-guru').value;
        const monthValue = document.getElementById('cetak-pilih-bulan').value;

        if (!id) {
            showCustomAlert('warning', 'Guru Belum Dipilih', 'Silakan pilih guru terlebih dahulu.');
            return;
        }
        const [year, month] = monthValue.split('-').map(Number);
        
        const guru = state.guru.find(g => g.id === id);
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const absensiGuru = state.absensi.filter(a => a.id === id);
        const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
        
        const reportHTML = generateReportHTML(guru, processedData[id], startDate, endDate, 1);
        document.getElementById('laporan-pratinau-wrapper').innerHTML = reportHTML;
        document.getElementById('btn-print-laporan').classList.remove('hidden');
        adjustKeteranganFontSize();
    }

    function tampilkanLaporanMulti() {
        const ids = state.ui.cetak.selectedIds;
        const [year, month] = document.getElementById('cetak-pilih-bulan').value.split('-').map(Number);
        
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const allReports = [];
        let currentPage = 1;
        ids.forEach(id => {
            const guru = state.guru.find(g => g.id === id);
            if (guru) {
                 const absensiGuru = state.absensi.filter(a => a.id === id);
                 const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
                 allReports.push(generateReportHTML(guru, processedData[id], startDate, endDate, currentPage));
                 currentPage++;
            }
        });

        document.getElementById('laporan-pratinau-wrapper').innerHTML = allReports.join('');
        document.getElementById('btn-print-laporan').classList.remove('hidden');
        document.getElementById('multi-print-message').textContent = `Laporan untuk ${ids.length} guru siap dicetak.`;
        adjustKeteranganFontSize();
    }

    // --- CETAK LAPORAN PAGE V.2 ---
    function renderCetakPageV2() {
        const multiPrintIds = state.ui.cetakV2.selectedIds;
        const controlsContainer = document.getElementById('cetak-controls-container-v2');
        const multiPrintStatusContainer = document.getElementById('multi-print-status-v2');
        const previewWrapper = document.getElementById('laporan-pratinau-wrapper-v2');
        
        if (multiPrintIds && multiPrintIds.length > 0) {
            controlsContainer.classList.add('hidden');
            multiPrintStatusContainer.classList.remove('hidden');
            document.getElementById('multi-print-message-v2').textContent = `Menyiapkan laporan untuk ${multiPrintIds.length} guru terpilih...`;
            previewWrapper.innerHTML = '';
            tampilkanLaporanMultiV2();
        } else {
            controlsContainer.classList.remove('hidden');
            multiPrintStatusContainer.classList.add('hidden');
            const guruSelect = document.getElementById('cetak-pilih-guru-v2');
            guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
                state.guru.map(g => `<option value="${g.id}">${g.nama} (${g.id})</option>`).join('');
            
            const now = new Date();
            const monthInput = document.getElementById('cetak-pilih-bulan-v2');
            if (!monthInput.value) {
                monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            previewWrapper.innerHTML = `<p style="text-align:center; color: var(--secondary-color); padding-top: 5rem;">Pilih guru dan periode, lalu klik "Tampilkan" untuk melihat pratinjau laporan.</p>`;
            document.getElementById('btn-print-laporan-v2').classList.add('hidden');
        }
    }

    function tampilkanLaporanV2() {
        const id = document.getElementById('cetak-pilih-guru-v2').value;
        const monthValue = document.getElementById('cetak-pilih-bulan-v2').value;

        if (!id) {
            showCustomAlert('warning', 'Guru Belum Dipilih', 'Silakan pilih guru terlebih dahulu.');
            return;
        }
        const [year, month] = monthValue.split('-').map(Number);
        
        const guru = state.guru.find(g => g.id === id);
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const absensiGuru = state.absensi.filter(a => a.id === id);
        const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
        
        const reportHTML = generateReportHTML_V2(guru, processedData[id], startDate, endDate, 1);
        document.getElementById('laporan-pratinau-wrapper-v2').innerHTML = reportHTML;
        document.getElementById('btn-print-laporan-v2').classList.remove('hidden');
        adjustKeteranganFontSize();
    }

    function tampilkanLaporanMultiV2() {
        const ids = state.ui.cetakV2.selectedIds;
        const [year, month] = document.getElementById('cetak-pilih-bulan-v2').value.split('-').map(Number);
        
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const allReports = [];
        let currentPage = 1;
        ids.forEach(id => {
            const guru = state.guru.find(g => g.id === id);
            if (guru) {
                 const absensiGuru = state.absensi.filter(a => a.id === id);
                 const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
                 allReports.push(generateReportHTML_V2(guru, processedData[id], startDate, endDate, currentPage));
                 currentPage++;
            }
        });

        document.getElementById('laporan-pratinau-wrapper-v2').innerHTML = allReports.join('');
        document.getElementById('btn-print-laporan-v2').classList.remove('hidden');
        document.getElementById('multi-print-message-v2').textContent = `Laporan untuk ${ids.length} guru siap dicetak.`;
        adjustKeteranganFontSize();
    }
    
    // --- CETAK LAPORAN PAGE V.3 ---
    function renderCetakPageV3() {
        const multiPrintIds = state.ui.cetakV3.selectedIds;
        const controlsContainer = document.getElementById('cetak-controls-container-v3');
        const multiPrintStatusContainer = document.getElementById('multi-print-status-v3');
        const previewWrapper = document.getElementById('laporan-pratinau-wrapper-v3');
        
        if (multiPrintIds && multiPrintIds.length > 0) {
            controlsContainer.classList.add('hidden');
            multiPrintStatusContainer.classList.remove('hidden');
            document.getElementById('multi-print-message-v3').textContent = `Menyiapkan laporan untuk ${multiPrintIds.length} guru terpilih...`;
            previewWrapper.innerHTML = '';
            tampilkanLaporanMultiV3();
        } else {
            controlsContainer.classList.remove('hidden');
            multiPrintStatusContainer.classList.add('hidden');
            const guruSelect = document.getElementById('cetak-pilih-guru-v3');
            guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
                state.guru.map(g => `<option value="${g.id}">${g.nama} (${g.id})</option>`).join('');
            
            const now = new Date();
            const monthInput = document.getElementById('cetak-pilih-bulan-v3');
            if (!monthInput.value) {
                monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            previewWrapper.innerHTML = `<p style="text-align:center; color: var(--secondary-color); padding-top: 5rem;">Pilih guru dan periode, lalu klik "Tampilkan" untuk melihat pratinjau laporan.</p>`;
            document.getElementById('btn-print-laporan-v3').classList.add('hidden');
        }
    }

    function tampilkanLaporanV3() {
        const id = document.getElementById('cetak-pilih-guru-v3').value;
        const monthValue = document.getElementById('cetak-pilih-bulan-v3').value;

        if (!id) {
            showCustomAlert('warning', 'Guru Belum Dipilih', 'Silakan pilih guru terlebih dahulu.');
            return;
        }
        const [year, month] = monthValue.split('-').map(Number);
        
        const guru = state.guru.find(g => g.id === id);
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const absensiGuru = state.absensi.filter(a => a.id === id);
        const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
        
        const reportHTML = generateReportHTML_V3(guru, processedData[id], startDate, endDate, 1);
        document.getElementById('laporan-pratinau-wrapper-v3').innerHTML = reportHTML;
        document.getElementById('btn-print-laporan-v3').classList.remove('hidden');
        adjustKeteranganFontSize();
    }

    function tampilkanLaporanMultiV3() {
        const ids = state.ui.cetakV3.selectedIds;
        const [year, month] = document.getElementById('cetak-pilih-bulan-v3').value.split('-').map(Number);
        
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const allReports = [];
        let currentPage = 1;
        ids.forEach(id => {
            const guru = state.guru.find(g => g.id === id);
            if (guru) {
                 const absensiGuru = state.absensi.filter(a => a.id === id);
                 const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
                 allReports.push(generateReportHTML_V3(guru, processedData[id], startDate, endDate, currentPage));
                 currentPage++;
            }
        });

        document.getElementById('laporan-pratinau-wrapper-v3').innerHTML = allReports.join('');
        document.getElementById('btn-print-laporan-v3').classList.remove('hidden');
        document.getElementById('multi-print-message-v3').textContent = `Laporan untuk ${ids.length} guru siap dicetak.`;
        adjustKeteranganFontSize();
    }

    // --- CETAK LAPORAN PAGE V.4 ---
    function renderCetakPageV4() {
        const multiPrintIds = state.ui.cetakV4.selectedIds;
        const controlsContainer = document.getElementById('cetak-controls-container-v4');
        const multiPrintStatusContainer = document.getElementById('multi-print-status-v4');
        const previewWrapper = document.getElementById('laporan-pratinau-wrapper-v4');
        
        if (multiPrintIds && multiPrintIds.length > 0) {
            controlsContainer.classList.add('hidden');
            multiPrintStatusContainer.classList.remove('hidden');
            document.getElementById('multi-print-message-v4').textContent = `Menyiapkan laporan untuk ${multiPrintIds.length} guru terpilih...`;
            previewWrapper.innerHTML = '';
            tampilkanLaporanMultiV4();
        } else {
            controlsContainer.classList.remove('hidden');
            multiPrintStatusContainer.classList.add('hidden');
            const guruSelect = document.getElementById('cetak-pilih-guru-v4');
            guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
                state.guru.map(g => `<option value="${g.id}">${g.nama} (${g.id})</option>`).join('');
            
            const now = new Date();
            const monthInput = document.getElementById('cetak-pilih-bulan-v4');
            if (!monthInput.value) {
                monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            previewWrapper.innerHTML = `<p style="text-align:center; color: var(--secondary-color); padding-top: 5rem;">Pilih guru dan periode, lalu klik "Tampilkan" untuk melihat pratinjau laporan.</p>`;
            document.getElementById('btn-print-laporan-v4').classList.add('hidden');
        }
    }

    function tampilkanLaporanV4() {
        const id = document.getElementById('cetak-pilih-guru-v4').value;
        const monthValue = document.getElementById('cetak-pilih-bulan-v4').value;

        if (!id) {
            showCustomAlert('warning', 'Guru Belum Dipilih', 'Silakan pilih guru terlebih dahulu.');
            return;
        }
        const [year, month] = monthValue.split('-').map(Number);
        
        const guru = state.guru.find(g => g.id === id);
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const absensiGuru = state.absensi.filter(a => a.id === id);
        const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
        
        const reportHTML = generateReportHTML_V4(guru, processedData[id], startDate, endDate, 1);
        document.getElementById('laporan-pratinau-wrapper-v4').innerHTML = reportHTML;
        document.getElementById('btn-print-laporan-v4').classList.remove('hidden');
        adjustKeteranganFontSize();
    }

    function tampilkanLaporanMultiV4() {
        const ids = state.ui.cetakV4.selectedIds;
        const [year, month] = document.getElementById('cetak-pilih-bulan-v4').value.split('-').map(Number);
        
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month - 1, lastDay));

        const allReports = [];
        let currentPage = 1;
        ids.forEach(id => {
            const guru = state.guru.find(g => g.id === id);
            if (guru) {
                 const absensiGuru = state.absensi.filter(a => a.id === id);
                 const processedData = processAbsensi(absensiGuru, [id], startDate, endDate);
                 allReports.push(generateReportHTML_V4(guru, processedData[id], startDate, endDate, currentPage));
                 currentPage++;
            }
        });

        document.getElementById('laporan-pratinau-wrapper-v4').innerHTML = allReports.join('');
        document.getElementById('btn-print-laporan-v4').classList.remove('hidden');
        document.getElementById('multi-print-message-v4').textContent = `Laporan untuk ${ids.length} guru siap dicetak.`;
        adjustKeteranganFontSize();
    }

    function generateReportHTML(guru, data, startDate, endDate, pageNumber) {
        const s = state.sekolah;
        const monthYear = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        
        const formatDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}-${month}-${year}`;
        };
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        
        const formatFooterDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };
        const formattedFooterEndDate = formatFooterDate(endDate);

        const kopLines = [];
        if (s.namaYayasan) {
            kopLines.push(`<h4 style="margin-bottom:0px;margin-top:0px;">${s.namaYayasan.toUpperCase()}</h4>`);
			kopLines.push(`<h2>${s.nama.toUpperCase()}</h2>`);
			kopLines.push(`<h3 style="margin-top:-10px;">TERAKREDITASI ${s.akreditasi.toUpperCase()}</h3>`);
        } else {
            kopLines.push(`<h3 style="font-size:14pt;">PEMERINTAH KABUPATEN ${s.kabupaten ? s.kabupaten.toUpperCase() : 'KABUPATEN/KOTA'}</h3>`);
            kopLines.push(`<h3 style="font-size:18pt;">${s.namaDinas ? s.namaDinas.toUpperCase() : 'DINAS PENDIDIKAN'}</h3>`);
			kopLines.push(`<h2 style="font-size:14pt;margin-bottom:-5px;">${s.nama.toUpperCase()}</h2>`);
        }

        const alamatLengkap = (`<p style="margin-top:0px;">${[s.alamat, s.desa, s.kecamatan, s.kabupaten, s.provinsi].filter(Boolean).join(', ')}, Kode Pos ${[s.kodePos].filter(Boolean).join(', ')}</p>`);
        
        const kontakParts = [];
        if (s.kontak) kontakParts.push(`Telp. ${s.kontak}`);
        if (s.faksimile) kontakParts.push(`Fax. ${s.faksimile}`);
        if (s.email) kontakParts.push(`Email: ${s.email}`);
        const kontakSekolah = `<p>${kontakParts.join(', ')}</p>`;
        
		const lamanSekolah = (`<p>Website: ${[s.website].filter(Boolean).join(', ')}</p>`);

		
        const rows = Object.entries(data.days).map(([dateStr, dayData]) => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const tgl = new Date(Date.UTC(y, m - 1, day));
            const formattedDate = `${String(tgl.getUTCDate()).padStart(2, '0')}/${String(tgl.getUTCMonth() + 1).padStart(2, '0')}/${tgl.getUTCFullYear()}`;
            
            return `
                <tr>
                    <td style="text-align:center;">${formattedDate}</td>
                    <td style="text-align:center;">${HARI[tgl.getUTCDay()]}</td>
                    <td>${dayData.jamKerjaMasuk}</td>
                    <td>${dayData.jamKerjaPulang}</td>
                    <td>${dayData.scanMasuk}</td>
                    <td>${dayData.scanKeluar}</td>
                    <td>${dayData.terlambat}</td>
                    <td>${dayData.plgCpt}</td>
                    <td>${dayData.lembur}</td>
                    <td>${dayData.jmlHadir}</td>
                    <td data-keterangan="${dayData.keterangan}" class="kolom-keterangan">${dayData.keterangan}</td>
                </tr>
            `;
        }).join('');

        const tableHeaders = `
            <thead>
                <tr>
                    <th style="vertical-align: middle;">Tanggal</th>
                    <th style="vertical-align: middle;">Hari</th>
                    <th style="vertical-align: middle;">Jam Masuk</th>
                    <th style="vertical-align: middle;">Jam Pulang</th>
                    <th style="vertical-align: middle;">Scan Masuk</th>
                    <th style="vertical-align: middle;">Scan Keluar</th>
                    <th style="vertical-align: middle;">Terlambat</th>
                    <th style="vertical-align: middle;">Plg Cpt</th>
                    <th style="vertical-align: middle;">Lembur</th>
                    <th style="vertical-align: middle;">Jml Hadir</th>
                    <th style="vertical-align: middle;">Keterangan</th>
                </tr>
				<tr>
					<th style="border:none;background:none;height:3px;padding:0;"> </th>
				</tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area">
            <div class="laporan-kop">
                <img src="${s.logo || LOGO_PLACEHOLDER}" alt="Logo Sekolah">
                <div class="laporan-kop-text">
                    ${kopLines.join('')}
                    ${alamatLengkap}
					${kontakSekolah}
					${lamanSekolah}
                </div>
            </div>
            <div class="laporan-title">
                <h4>LAPORAN PRESENSI KEHADIRAN</h4>
                <p style="text-transform:uppercase;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td>No. ID</td>
					<td width="5">:</td>
					<td>${guru.id}</td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama" width="52">Nama</td>
					<td>:</td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p>NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p>NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas">
                    <p>Mengetahui,</p>
                    <p>Pengawas Sekolah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p>NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }
    
    function generateReportHTML_V2(guru, data, startDate, endDate, pageNumber) {
        const s = state.sekolah;
        const monthYear = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        
        const formatDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}-${month}-${year}`;
        };
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        
        const formatFooterDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };
        const formattedFooterEndDate = formatFooterDate(endDate);

        const kopLines = [];
        if (s.namaYayasan) {
            kopLines.push(`<h4 style="margin-bottom:0px;margin-top:0px;">${s.namaYayasan.toUpperCase()}</h4>`);
			kopLines.push(`<h2>${s.nama.toUpperCase()}</h2>`);
			kopLines.push(`<h3 style="margin-top:-10px;">TERAKREDITASI ${s.akreditasi.toUpperCase()}</h3>`);
        } else {
            kopLines.push(`<h3 style="font-size:14pt;">PEMERINTAH KABUPATEN ${s.kabupaten ? s.kabupaten.toUpperCase() : 'KABUPATEN/KOTA'}</h3>`);
            kopLines.push(`<h3 style="font-size:18pt;">${s.namaDinas ? s.namaDinas.toUpperCase() : 'DINAS PENDIDIKAN'}</h3>`);
			kopLines.push(`<h2 style="font-size:14pt;margin-bottom:-5px;">${s.nama.toUpperCase()}</h2>`);
        }

        const alamatLengkap = (`<p style="margin-top:0px;">${[s.alamat, s.desa, s.kecamatan, s.kabupaten, s.provinsi].filter(Boolean).join(', ')}, Kode Pos ${[s.kodePos].filter(Boolean).join(', ')}</p>`);
        
        const kontakParts = [];
        if (s.kontak) kontakParts.push(`Telp. ${s.kontak}`);
        if (s.faksimile) kontakParts.push(`Fax. ${s.faksimile}`);
        if (s.email) kontakParts.push(`Email: ${s.email}`);
        const kontakSekolah = `<p>${kontakParts.join(', ')}</p>`;
        
		const lamanSekolah = (`<p>Website: ${[s.website].filter(Boolean).join(', ')}</p>`);

		
        const rows = Object.entries(data.days).map(([dateStr, dayData]) => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const tgl = new Date(Date.UTC(y, m - 1, day));
            const formattedDate = `${String(tgl.getUTCDate()).padStart(2, '0')}/${String(tgl.getUTCMonth() + 1).padStart(2, '0')}/${tgl.getUTCFullYear()}`;
            
            return `
                <tr>
                    <td style="text-align:center;">${formattedDate}</td>
                    <td style="text-align:center;">${HARI[tgl.getUTCDay()]}</td>
                    <td>${dayData.jamKerjaMasuk}</td>
                    <td>${dayData.jamKerjaPulang}</td>
                    <td>${dayData.scanMasuk}</td>
                    <td>${dayData.scanKeluar}</td>
                    <td>${dayData.terlambat}</td>
                    <td>${dayData.plgCpt}</td>
                    <td>${dayData.lembur}</td>
                    <td>${dayData.jmlHadir}</td>
                    <td data-keterangan="${dayData.keterangan}" class="kolom-keterangan">${dayData.keterangan}</td>
                </tr>
            `;
        }).join('');

        const tableHeaders = `
            <thead>
                <tr>
                    <th style="vertical-align: middle;">Tanggal</th>
                    <th style="vertical-align: middle;">Hari</th>
                    <th style="vertical-align: middle;">Jam Masuk</th>
                    <th style="vertical-align: middle;">Jam Pulang</th>
                    <th style="vertical-align: middle;">Scan Masuk</th>
                    <th style="vertical-align: middle;">Scan Keluar</th>
                    <th style="vertical-align: middle;">Terlambat</th>
                    <th style="vertical-align: middle;">Plg Cpt</th>
                    <th style="vertical-align: middle;">Lembur</th>
                    <th style="vertical-align: middle;">Jml Hadir</th>
                    <th style="vertical-align: middle;">Keterangan</th>
                </tr>
				<tr>
					<th style="border:none;background:none;height:3px;padding:0;"> </th>
				</tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area-v2">
            <div class="laporan-kop">
                <img src="${s.logo || LOGO_PLACEHOLDER}" alt="Logo Sekolah">
                <div class="laporan-kop-text">
                    ${kopLines.join('')}
                    ${alamatLengkap}
					${kontakSekolah}
					${lamanSekolah}
                </div>
            </div>
            <div class="laporan-title">
                <h4>LAPORAN PRESENSI KEHADIRAN</h4>
                <p style="text-transform:uppercase;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td>No. ID</td>
					<td width="5">:</td>
					<td>${guru.id}</td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama" width="52">Nama</td>
					<td>:</td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box" style="text-align:left;width:95%;margin-left:117px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p>NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box" style="text-align:left;border:0px solid black;">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p>NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas" style="width:75%;margin-left:120px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Pengawas Madrasah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p>NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }

    // --- NEW FUNCTION: generateReportHTML_V3 (Tanpa Kop) ---
    function generateReportHTML_V3(guru, data, startDate, endDate, pageNumber) {
        const s = state.sekolah;
        const monthYear = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        
        const formatDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}-${month}-${year}`;
        };
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        
        const formatFooterDate = (date) => {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };
        const formattedFooterEndDate = formatFooterDate(endDate);

        const rows = Object.entries(data.days).map(([dateStr, dayData]) => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const tgl = new Date(Date.UTC(y, m - 1, day));
            const formattedDate = `${String(tgl.getUTCDate()).padStart(2, '0')}/${String(tgl.getUTCMonth() + 1).padStart(2, '0')}/${tgl.getUTCFullYear()}`;
            
            return `
                <tr>
                    <td style="text-align:center;">${formattedDate}</td>
                    <td style="text-align:center;">${HARI[tgl.getUTCDay()]}</td>
                    <td>${dayData.jamKerjaMasuk}</td>
                    <td>${dayData.jamKerjaPulang}</td>
                    <td>${dayData.scanMasuk}</td>
                    <td>${dayData.scanKeluar}</td>
                    <td>${dayData.terlambat}</td>
                    <td>${dayData.plgCpt}</td>
                    <td>${dayData.lembur}</td>
                    <td>${dayData.jmlHadir}</td>
                    <td data-keterangan="${dayData.keterangan}" class="kolom-keterangan">${dayData.keterangan}</td>
                </tr>
            `;
        }).join('');

        const tableHeaders = `
            <thead>
                <tr>
                    <th style="vertical-align: middle;">Tanggal</th>
                    <th style="vertical-align: middle;">Hari</th>
                    <th style="vertical-align: middle;">Jam Masuk</th>
                    <th style="vertical-align: middle;">Jam Pulang</th>
                    <th style="vertical-align: middle;">Scan Masuk</th>
                    <th style="vertical-align: middle;">Scan Keluar</th>
                    <th style="vertical-align: middle;">Terlambat</th>
                    <th style="vertical-align: middle;">Plg Cpt</th>
                    <th style="vertical-align: middle;">Lembur</th>
                    <th style="vertical-align: middle;">Jml Hadir</th>
                    <th style="vertical-align: middle;">Keterangan</th>
                </tr>
				<tr>
					<th style="border:none;background:none;height:3px;padding:0;" colspan="11"></th>
				</tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area-v3">
            <div class="laporan-title" style="margin-top:0;">
                <h4>LAPORAN PRESENSI KEHADIRAN</h4>
                <p style="text-transform:uppercase;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td>No. ID</td>
					<td width="5">:</td>
					<td>${guru.id}</td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama-v3" width="60">Nama</td>
					<td>:</td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                 <colgroup>
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                 <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p>NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p>NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas">
                    <p>Mengetahui,</p>
                    <p>Pengawas Sekolah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p>NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }

    // --- NEW FUNCTION: generateReportHTML_V4 (Tanpa Kop Madrasah) ---
    function generateReportHTML_V4(guru, data, startDate, endDate, pageNumber) {
        const s = state.sekolah;
        const monthYear = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        
        const formatDate = (date) => `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`;
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        
        const formatFooterDate = (date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
        const formattedFooterEndDate = formatFooterDate(endDate);

        const rows = Object.entries(data.days).map(([dateStr, dayData]) => {
            const [y, m, day] = dateStr.split('-').map(Number);
            const tgl = new Date(Date.UTC(y, m - 1, day));
            const formattedDate = `${String(tgl.getUTCDate()).padStart(2, '0')}/${String(tgl.getUTCMonth() + 1).padStart(2, '0')}/${tgl.getUTCFullYear()}`;
            return `
                <tr>
                    <td style="text-align:center;">${formattedDate}</td>
                    <td style="text-align:center;">${HARI[tgl.getUTCDay()]}</td>
                    <td>${dayData.jamKerjaMasuk}</td>
                    <td>${dayData.jamKerjaPulang}</td>
                    <td>${dayData.scanMasuk}</td>
                    <td>${dayData.scanKeluar}</td>
                    <td>${dayData.terlambat}</td>
                    <td>${dayData.plgCpt}</td>
                    <td>${dayData.lembur}</td>
                    <td>${dayData.jmlHadir}</td>
                    <td data-keterangan="${dayData.keterangan}" class="kolom-keterangan">${dayData.keterangan}</td>
                </tr>
            `;
        }).join('');

        const tableHeaders = `
             <thead>
                <tr>
                    <th style="vertical-align: middle;">Tanggal</th>
                    <th style="vertical-align: middle;">Hari</th>
                    <th style="vertical-align: middle;">Jam Masuk</th>
                    <th style="vertical-align: middle;">Jam Pulang</th>
                    <th style="vertical-align: middle;">Scan Masuk</th>
                    <th style="vertical-align: middle;">Scan Keluar</th>
                    <th style="vertical-align: middle;">Terlambat</th>
                    <th style="vertical-align: middle;">Plg Cpt</th>
                    <th style="vertical-align: middle;">Lembur</th>
                    <th style="vertical-align: middle;">Jml Hadir</th>
                    <th style="vertical-align: middle;">Keterangan</th>
                </tr>
				<tr><th style="border:none;background:none;height:3px;padding:0;" colspan="11"></th></tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area-v4">
             <div class="laporan-title" style="margin-top:0;">
                <h4>LAPORAN PRESENSI KEHADIRAN</h4>
                <p style="text-transform:uppercase;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
                        <td>No. ID</td><td width="5">:</td><td>${guru.id}</td>
                        <td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
                        <td class="laporan-identitas-nama-v3" width="60">Nama</td><td>:</td><td><strong>${guru.nama}</strong></td>
                        <td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 35px;"><col style="width: 35px;"><col style="width: 40px;"><col style="width: 40px;">
                    <col style="width: 40px;"><col style="width: 40px;"><col style="width: 35px;"><col style="width: 35px;">
                    <col style="width: 35px;"><col style="width: 35px;"><col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box" style="text-align:left;width:95%;margin-left:117px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p>NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box" style="text-align:left;border:0px solid black;">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p>NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas" style="width:75%;margin-left:120px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Pengawas Madrasah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p>NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }

    async function generateAndDownloadPdf(wrapperId, baseFileName, selectedIds) {
        showCustomAlert('loading', 'Membuat PDF', 'Harap tunggu, laporan sedang dikonversi ke format PDF...');
    
        const { jsPDF } = jspdf;
        const reportWrapper = document.getElementById(wrapperId);
    
        if (!reportWrapper) {
            hideCustomAlert();
            showCustomAlert('error', 'Kesalahan', 'Elemen pratinjau laporan tidak ditemukan.');
            return;
        }
    
        const reportElements = reportWrapper.querySelectorAll('.laporan-container');
        if (reportElements.length === 0) {
            hideCustomAlert();
            showCustomAlert('error', 'Kesalahan', 'Tidak ada laporan untuk dibuatkan PDF.');
            return;
        }
    
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
    
        for (let i = 0; i < reportElements.length; i++) {
            const reportElement = reportElements[i];
    
            try {
                const canvas = await html2canvas(reportElement, {
                    scale: 2.5, // Increase scale for better quality
                    useCORS: true,
                    logging: false,
                });
    
                if (i > 0) {
                    pdf.addPage();
                }
    
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
    
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            } catch (error) {
                console.error("Error generating PDF page:", error);
                hideCustomAlert();
                showCustomAlert('error', 'Gagal Membuat PDF', 'Terjadi kesalahan saat mengonversi laporan.');
                return;
            }
        }
    
        // Dynamic filename generation
        const parentSection = reportWrapper.closest('section');
        const monthInput = parentSection?.querySelector('input[type="month"]');
        const guruSelect = parentSection?.querySelector('select');
        
        let fileName = `${baseFileName}.pdf`;
    
        if (selectedIds.length > 1) { // Multi-print mode
            const monthYear = monthInput ? new Date(monthInput.value + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Laporan';
            fileName = `Laporan Absensi Massal - ${monthYear}.pdf`;
        } else if (guruSelect && guruSelect.value && monthInput) { // Single print mode
            const guruName = guruSelect.options[guruSelect.selectedIndex].text.split(' (')[0];
            const monthYear = new Date(monthInput.value + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            fileName = `Laporan Absensi - ${guruName} - ${monthYear}.pdf`;
        }
    
        pdf.save(fileName);
        hideCustomAlert();
    }


    // --- EVENT LISTENERS ---

    // Navigation
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.id.replace('btn-', 'page-');
            showPage(pageId);
            if (window.innerWidth <= 992) { // Close mobile menu on selection
                body.classList.remove('mobile-nav-open');
            }
        });
    });

    mobileMenuToggle.addEventListener('click', () => {
        body.classList.add('mobile-nav-open');
    });

    mobileMenuClose.addEventListener('click', () => {
        body.classList.remove('mobile-nav-open');
    });
    
    document.addEventListener('click', (e) => {
        if (body.classList.contains('mobile-nav-open')) {
            const target = e.target;
            // Close if clicking outside the nav and not on the toggle button
            if (!target.closest('nav') && !target.closest('#mobile-menu-toggle')) {
                body.classList.remove('mobile-nav-open');
            }
        }
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        body.classList.toggle('sidebar-minimized');
    });

    // Data Guru
    document.getElementById('btn-input-guru-baru').addEventListener('click', () => openGuruModal());
    document.getElementById('btn-close-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
    document.getElementById('btn-cancel-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
    document.getElementById('form-guru').addEventListener('submit', (e) => { e.preventDefault(); });
    document.getElementById('btn-save-guru').addEventListener('click', saveGuru);
    
    document.getElementById('daftar-guru-container').addEventListener('click', (e) => {
        const target = e.target;
        const editBtn = target.closest('.btn-edit');
        const deleteBtn = target.closest('.btn-delete');
        const checkbox = target.closest('.guru-checkbox');
        const row = target.closest('tr');

        if (editBtn) {
            openGuruModal(editBtn.dataset.id);
        } else if (deleteBtn) {
            const guruId = deleteBtn.dataset.id;
            const guru = state.guru.find(g => g.id === guruId);
            showCustomConfirm('Konfirmasi Hapus', `Anda yakin ingin menghapus data guru: <strong>${guru?.nama || 'ini'}</strong>?`, 'Ya, Hapus')
                .then(confirmed => {
                    if (confirmed) {
                        deleteGuru(guruId);
                        showCustomAlert('success', 'Berhasil', 'Data guru telah dihapus.');
                    }
                });
        } else if (checkbox) {
            const id = checkbox.dataset.id;
            if (checkbox.checked) {
                state.ui.guru.selectedIds.add(id);
            } else {
                state.ui.guru.selectedIds.delete(id);
            }
            renderGuruList(); // Re-render to update row styles and select-all state
        } else if (row && row.dataset.id && !target.closest('button')) {
             // Handle row click to toggle checkbox, but not if a button was clicked
            const id = row.dataset.id;
            const rowCheckbox = row.querySelector('.guru-checkbox');
            if (rowCheckbox) {
                rowCheckbox.checked = !rowCheckbox.checked;
                // Manually trigger the change event
                const event = new Event('change', { bubbles: true });
                rowCheckbox.dispatchEvent(event);
                 if (rowCheckbox.checked) {
                    state.ui.guru.selectedIds.add(id);
                } else {
                    state.ui.guru.selectedIds.delete(id);
                }
                renderGuruList();
            }
        }
    });

    document.getElementById('search-guru-input').addEventListener('input', (e) => {
        state.ui.guru.searchQuery = e.target.value;
        state.ui.guru.currentPage = 1; // Reset to first page on search
        renderGuruList();
        document.getElementById('clear-search-guru-btn').classList.toggle('hidden', !e.target.value);
    });
    
    document.getElementById('clear-search-guru-btn').addEventListener('click', () => {
        document.getElementById('search-guru-input').value = '';
        state.ui.guru.searchQuery = '';
        renderGuruList();
        document.getElementById('clear-search-guru-btn').classList.add('hidden');
    });

    // Bulk Actions Guru
    document.getElementById('btn-delete-selected-guru').addEventListener('click', () => {
        const count = state.ui.guru.selectedIds.size;
        showCustomConfirm('Konfirmasi Hapus Massal', `Anda yakin ingin menghapus <strong>${count}</strong> data guru yang dipilih?`, 'Ya, Hapus Semua')
            .then(confirmed => {
                if (confirmed) {
                    state.ui.guru.selectedIds.forEach(id => {
                        state.guru = state.guru.filter(g => g.id !== id);
                    });
                    state.ui.guru.selectedIds.clear();
                    saveState();
                    renderGuruPage();
                    renderDashboard();
                    showCustomAlert('success', 'Berhasil', `${count} data guru telah dihapus.`);
                }
            });
    });
    
    document.getElementById('btn-print-selected-guru').addEventListener('click', () => {
        const selectedIds = Array.from(state.ui.guru.selectedIds);
        if (selectedIds.length === 0) {
            showCustomAlert('warning', 'Tidak Ada Guru Terpilih', 'Silakan pilih guru yang ingin dicetak laporannya.');
            return;
        }

        // We need to decide which report version to use. Let's default to V.1
        // and allow user to choose in a future update if needed.
        state.ui.cetak.selectedIds = selectedIds; // Using cetak V.1 state
        showPage('page-cetak');
    });
    
    // Import/Export Guru
    document.getElementById('btn-import-guru').addEventListener('click', () => {
        document.getElementById('import-guru-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-import-guru-modal').addEventListener('click', () => {
        document.getElementById('import-guru-modal').classList.add('hidden');
    });

    document.getElementById('btn-cancel-import-guru-modal').addEventListener('click', () => {
        document.getElementById('import-guru-modal').classList.add('hidden');
    });
    
    document.getElementById('btn-download-template-guru').addEventListener('click', () => {
        const data = [
            ['ID_Unik', 'NIP', 'Nama', 'Jabatan', 'Jenis_Guru'],
            ['101', '198501012010011001', 'Budi Santoso, S.Pd.', 'Guru Matematika', 'Reguler/PNS'],
            ['102', '', 'Siti Aminah', 'Guru Bahasa Inggris', 'Honorer']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
        XLSX.writeFile(wb, 'Template_Import_Guru.xlsx');
    });

    document.getElementById('btn-confirm-import-guru').addEventListener('click', () => {
        const fileInput = document.getElementById('import-guru-file-input');
        const file = fileInput.files[0];
        if (!file) {
            showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file Excel untuk diimpor.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Assuming header is in the first row
                const headers = jsonData[0].map(h => h.trim());
                const requiredHeaders = ['ID_Unik', 'NIP', 'Nama', 'Jabatan', 'Jenis_Guru'];
                
                // Very basic header check
                if (headers[0] !== requiredHeaders[0] || headers[2] !== requiredHeaders[2]) {
                     showCustomAlert('error', 'Format Salah', 'Header file Excel tidak sesuai. Pastikan kolom pertama adalah "ID_Unik" dan kolom ketiga adalah "Nama".');
                     return;
                }

                const newGuruList = [];
                let addedCount = 0;
                let updatedCount = 0;
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || !row[0] || !row[2]) continue; // Skip empty rows

                    const guruData = {
                        id: String(row[0]).trim(),
                        nip: row[1] ? String(row[1]).trim() : '',
                        nama: String(row[2]).trim(),
                        jabatan: row[3] ? String(row[3]).trim() : '',
                        jenisGuru: (String(row[4] || 'Reguler/PNS').trim() === 'Honorer') ? 'Honorer' : 'Reguler/PNS'
                    };
                    
                    newGuruList.push(guruData);
                }

                // Merge with existing data
                newGuruList.forEach(newGuru => {
                    const existingIndex = state.guru.findIndex(g => g.id === newGuru.id);
                    if (existingIndex > -1) {
                        state.guru[existingIndex] = newGuru;
                        updatedCount++;
                    } else {
                        state.guru.push(newGuru);
                        addedCount++;
                    }
                });

                saveState();
                renderGuruPage();
                renderDashboard();
                document.getElementById('import-guru-modal').classList.add('hidden');
                showCustomAlert('success', 'Import Berhasil', `${addedCount} guru baru ditambahkan dan ${updatedCount} guru diperbarui.`);
            } catch (error) {
                 showCustomAlert('error', 'Gagal Membaca File', 'Terjadi kesalahan saat memproses file Excel. Pastikan formatnya benar.');
                 console.error(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById('btn-export-guru').addEventListener('click', () => {
        const dataToExport = state.guru.map(g => ({
            'ID_Unik': g.id,
            'NIP': g.nip,
            'Nama': g.nama,
            'Jabatan': g.jabatan,
            'Jenis_Guru': g.jenisGuru
        }));

        if(dataToExport.length === 0) {
            showCustomAlert('warning', 'Tidak Ada Data', 'Tidak ada data guru untuk diekspor.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
        XLSX.writeFile(wb, 'Export_Data_Guru.xlsx');
    });

    // Set Manual Absensi
    document.getElementById('btn-tampilkan-manual-absensi').addEventListener('click', () => {
        const guruId = document.getElementById('manual-absensi-guru').value;
        const monthYear = document.getElementById('manual-absensi-bulan').value;
        if (!guruId) {
            showCustomAlert('warning', 'Pilih Guru', 'Silakan pilih guru terlebih dahulu.');
            return;
        }
        if (!monthYear) {
            showCustomAlert('warning', 'Pilih Periode', 'Silakan pilih bulan dan tahun.');
            return;
        }
        generateManualAbsensiForm(guruId, monthYear);
    });

    document.getElementById('manual-absensi-form-container').addEventListener('click', (e) => {
        const target = e.target;
        const saveBtn = target.closest('#btn-simpan-manual-absensi');
        const resetAllBtn = target.closest('#btn-reset-manual-absensi');
        const resetHarianBtn = target.closest('.btn-reset-harian');
        const liveAbsensiBtn = target.closest('#btn-live-absensi');

        if (saveBtn) {
            const guruId = document.getElementById('manual-absensi-guru').value;
            const rows = document.querySelectorAll('#manual-absensi-form-container tbody tr');
            let changes = 0;
            rows.forEach(row => {
                const tr = row;
                const date = tr.dataset.date;
                if (date) {
                    const key = `${guruId}-${date}`;
                    const masuk = tr.querySelector('.manual-jam:nth-of-type(1)').value.trim();
                    const pulang = tr.querySelector('.manual-jam:nth-of-type(2)').value.trim();
                    const keterangan = tr.querySelector('.manual-keterangan').value.trim();

                    if (masuk || pulang || keterangan) {
                        state.kehadiranOverrides[key] = { masuk, pulang, keterangan };
                        changes++;
                    } else {
                        delete state.kehadiranOverrides[key];
                    }
                }
            });
            saveState();
            showCustomAlert('success', 'Berhasil', `Perubahan data kehadiran manual telah disimpan.`);
        }
        
        if (resetAllBtn) {
            showCustomConfirm('Konfirmasi Reset', 'Anda yakin ingin menghapus semua isian kehadiran manual untuk guru dan periode ini?', 'Ya, Reset')
                .then(confirmed => {
                    if (confirmed) {
                        const guruId = document.getElementById('manual-absensi-guru').value;
                        const monthYear = document.getElementById('manual-absensi-bulan').value;
                        const prefix = `${guruId}-${monthYear}`;
                        Object.keys(state.kehadiranOverrides).forEach(key => {
                            if (key.startsWith(prefix)) {
                                delete state.kehadiranOverrides[key];
                            }
                        });
                        saveState();
                        generateManualAbsensiForm(guruId, monthYear); // Refresh form
                        showCustomAlert('success', 'Berhasil', 'Semua isian manual telah direset.');
                    }
                });
        }
        
        if (resetHarianBtn) {
            const row = resetHarianBtn.closest('tr');
            row.querySelector('td:nth-child(3) .manual-jam').value = '';
            row.querySelector('td:nth-child(4) .manual-jam').value = '';
            row.querySelector('td:nth-child(5) .manual-keterangan').value = '';
            row.classList.remove('holiday-row'); // remove class if any
            row.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
        }

        if (liveAbsensiBtn) {
            const action = liveAbsensiBtn.dataset.action; // 'masuk' or 'pulang'
            const guruId = document.getElementById('manual-absensi-guru').value;
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const key = `${guruId}-${todayStr}`;
            const existingOverride = state.kehadiranOverrides[key] || { masuk: '', pulang: '', keterangan: '' };
            
            if (action === 'masuk') {
                existingOverride.masuk = timeStr;
            } else if (action === 'pulang') {
                existingOverride.pulang = timeStr;
            }
            
            state.kehadiranOverrides[key] = existingOverride;
            saveState();

            // Refresh the live section to show the update
             const monthYear = document.getElementById('manual-absensi-bulan').value;
             generateManualAbsensiForm(guruId, monthYear);
             showCustomAlert('success', 'Berhasil', `Absen ${action} pada pukul ${timeStr} berhasil direkam.`);
        }
    });

    // Event delegation for text area auto-disabling inputs
    document.getElementById('manual-absensi-form-container').addEventListener('input', (e) => {
        const target = e.target;
        if (target.classList.contains('manual-keterangan')) {
            const row = target.closest('tr');
            const hasText = target.value.trim() !== '';
            const jamInputs = row.querySelectorAll('.manual-jam, .time-picker-trigger');
            jamInputs.forEach(input => {
                input.disabled = hasText;
                if(hasText) {
                    input.value = ''; // Clear time if keterangan is filled
                }
            });
            if (hasText) {
                row.classList.add('holiday-row'); // apply disabled style
            } else {
                row.classList.remove('holiday-row');
            }
        }
    });

    // Import Absensi
    document.getElementById('btn-import-absensi').addEventListener('click', () => {
        if(state.guru.length === 0) {
            showCustomAlert('warning', 'Tidak Ada Guru', 'Harap tambahkan data guru terlebih dahulu sebelum mengimpor absensi.');
            return;
        }
        document.getElementById('import-absensi-modal').classList.remove('hidden');
    });
    
    document.getElementById('btn-close-import-absensi-modal').addEventListener('click', () => {
        document.getElementById('import-absensi-modal').classList.add('hidden');
    });
    
    document.getElementById('btn-cancel-import-absensi-modal').addEventListener('click', () => {
        document.getElementById('import-absensi-modal').classList.add('hidden');
    });
    
    document.getElementById('btn-download-template-absensi').addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        
        state.guru.forEach(guru => {
            const safeSheetName = `${guru.nama.substring(0, 20)} (${guru.id})`.replace(/[\\/*?[\]:]/g, ""); // Make sheet name safe
            const data = [
                ['Tanggal', 'Jam_Masuk', 'Jam_Pulang', 'Keterangan'],
                ['2024-07-01', '07:00', '15:00', ''],
                ['2024-07-02', '', '', 'Sakit'],
            ];
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });

        if (state.guru.length === 0) {
             const data = [['Tanggal', 'Jam_Masuk', 'Jam_Pulang', 'Keterangan']];
             const ws = XLSX.utils.aoa_to_sheet(data);
             XLSX.utils.book_append_sheet(wb, ws, 'Contoh');
        }

        XLSX.writeFile(wb, 'Template_Import_Absensi_Massal.xlsx');
    });

    document.getElementById('btn-confirm-import-absensi').addEventListener('click', () => {
        const fileInput = document.getElementById('import-absensi-file-input');
        const file = fileInput.files[0];
        if (!file) {
            showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file Excel untuk diimpor.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                let recordsImported = 0;

                workbook.SheetNames.forEach(sheetName => {
                    const match = sheetName.match(/\((\d+)\)$/);
                    if (match && match[1]) {
                        const guruId = match[1];
                        if (state.guru.some(g => g.id === guruId)) {
                            const ws = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(ws);

                            jsonData.forEach(row => {
                                const tanggal = row['Tanggal'];
                                const jamMasuk = row['Jam_Masuk'] || '';
                                const jamPulang = row['Jam_Pulang'] || '';
                                const keterangan = row['Keterangan'] || '';

                                let dateStr;
                                if (tanggal instanceof Date) {
                                    // Adjust for timezone offset if XLSX parses it as local time
                                    const tzoffset = tanggal.getTimezoneOffset() * 60000;
                                    const localISOTime = (new Date(tanggal.getTime() - tzoffset)).toISOString().slice(0, 10);
                                    dateStr = localISOTime;
                                } else if (typeof tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
                                    dateStr = tanggal;
                                }

                                if (dateStr) {
                                    const key = `${guruId}-${dateStr}`;
                                    state.kehadiranOverrides[key] = {
                                        masuk: jamMasuk,
                                        pulang: jamPulang,
                                        keterangan: keterangan
                                    };
                                    recordsImported++;
                                }
                            });
                        }
                    }
                });

                saveState();
                // Optionally refresh the current view if a guru is selected
                const currentGuruId = document.getElementById('manual-absensi-guru').value;
                if(currentGuruId) {
                    const currentMonth = document.getElementById('manual-absensi-bulan').value;
                    generateManualAbsensiForm(currentGuruId, currentMonth);
                }
                document.getElementById('import-absensi-modal').classList.add('hidden');
                showCustomAlert('success', 'Import Berhasil', `${recordsImported} data kehadiran berhasil diimpor/diperbarui.`);

            } catch (error) {
                console.error("Error importing attendance:", error);
                showCustomAlert('error', 'Gagal Membaca File', 'Terjadi kesalahan saat memproses file Excel. Pastikan formatnya benar.');
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // Identitas
    document.getElementById('form-identitas').addEventListener('submit', (e) => { e.preventDefault(); saveIdentitas(); });
    handleImageUpload(document.getElementById('sekolah-logo'), document.getElementById('logo-preview'), (base64) => {
        state.sekolah.logo = base64;
    });

    // Jadwal
    document.getElementById('form-jadwal').addEventListener('submit', (e) => { e.preventDefault(); saveJadwal(); });

    // Cetak Laporan V1
    document.getElementById('btn-tampilkan-laporan').addEventListener('click', tampilkanLaporan);
    document.getElementById('btn-print-laporan').addEventListener('click', () => {
        generateAndDownloadPdf('laporan-pratinau-wrapper', 'Laporan Kehadiran V1', state.ui.cetak.selectedIds);
    });
    document.getElementById('btn-cancel-multi-print').addEventListener('click', () => {
        state.ui.cetak.selectedIds = [];
        renderCetakPage(); // Reset the page
    });

    // Cetak Laporan V2
    document.getElementById('btn-tampilkan-laporan-v2').addEventListener('click', tampilkanLaporanV2);
    document.getElementById('btn-print-laporan-v2').addEventListener('click', () => {
        generateAndDownloadPdf('laporan-pratinau-wrapper-v2', 'Laporan Kehadiran V2', state.ui.cetakV2.selectedIds);
    });
    document.getElementById('btn-cancel-multi-print-v2').addEventListener('click', () => {
        state.ui.cetakV2.selectedIds = [];
        renderCetakPageV2();
    });

    // Cetak Laporan V3
    document.getElementById('btn-tampilkan-laporan-v3').addEventListener('click', tampilkanLaporanV3);
    document.getElementById('btn-print-laporan-v3').addEventListener('click', () => {
        generateAndDownloadPdf('laporan-pratinau-wrapper-v3', 'Laporan Kehadiran V3', state.ui.cetakV3.selectedIds);
    });
    document.getElementById('btn-cancel-multi-print-v3').addEventListener('click', () => {
        state.ui.cetakV3.selectedIds = [];
        renderCetakPageV3();
    });

     // Cetak Laporan V4
    document.getElementById('btn-tampilkan-laporan-v4').addEventListener('click', tampilkanLaporanV4);
    document.getElementById('btn-print-laporan-v4').addEventListener('click', () => {
        generateAndDownloadPdf('laporan-pratinau-wrapper-v4', 'Laporan Kehadiran V4', state.ui.cetakV4.selectedIds);
    });
    document.getElementById('btn-cancel-multi-print-v4').addEventListener('click', () => {
        state.ui.cetakV4.selectedIds = [];
        renderCetakPageV4();
    });

    // Backup & Restore
    document.getElementById('btn-backup-data').addEventListener('click', () => {
        try {
            const dataToBackup = {
                sekolah: state.sekolah,
                pengaturanKerja: state.pengaturanKerja,
                guru: state.guru,
                absensi: state.absensi,
                kehadiranOverrides: state.kehadiranOverrides
            };
            const jsonString = JSON.stringify(dataToBackup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0,10);
            a.href = url;
            a.download = `backup_absensi_guru_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showCustomAlert('success', 'Backup Berhasil', 'File backup telah diunduh.');
        } catch (e) {
            console.error("Backup failed:", e);
            showCustomAlert('error', 'Backup Gagal', 'Terjadi kesalahan saat membuat file backup.');
        }
    });

    document.getElementById('btn-restore-data').addEventListener('click', () => {
        document.getElementById('restore-file-input').click();
    });
    
    document.getElementById('restore-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showCustomConfirm('Konfirmasi Restore', 'Anda yakin ingin merestore data dari file ini? <strong>Semua data saat ini akan ditimpa.</strong>', 'Ya, Restore')
            .then(confirmed => {
                if (confirmed) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const restoredData = JSON.parse(event.target.result);
                            // Basic validation
                            if (restoredData.sekolah && restoredData.guru) {
                                state.sekolah = restoredData.sekolah;
                                state.pengaturanKerja = restoredData.pengaturanKerja || state.pengaturanKerja;
                                state.guru = restoredData.guru;
                                state.absensi = restoredData.absensi || [];
                                state.kehadiranOverrides = restoredData.kehadiranOverrides || {};
                                saveState();
                                loadState(); // Ensure everything is consistent
                                updateSharedUI();
                                showPage('page-dashboard'); // Go to dashboard after restore
                                showCustomAlert('success', 'Restore Berhasil', 'Data telah berhasil dipulihkan.');
                            } else {
                                throw new Error("Invalid backup file format.");
                            }
                        } catch (err) {
                            console.error("Restore failed:", err);
                            showCustomAlert('error', 'Restore Gagal', 'File backup tidak valid atau rusak.');
                        } finally {
                            // Reset file input
                             e.target.value = '';
                        }
                    };
                    reader.readAsText(file);
                } else {
                    e.target.value = ''; // Reset if cancelled
                }
            });
    });

    document.getElementById('btn-reset-app').addEventListener('click', () => {
        showCustomConfirm(
            'ANDA YAKIN?',
            'Tindakan ini akan <strong>MENGHAPUS SEMUA DATA</strong> secara permanen. <br><br>Gunakan dengan hati-hati.',
            'Ya, Hapus Semua'
        ).then(confirmed => {
            if (confirmed) {
                localStorage.removeItem(STORAGE_KEY);
                showCustomAlert('success', 'Berhasil', 'Aplikasi telah direset. Halaman akan dimuat ulang.');
                setTimeout(() => window.location.reload(), 2000);
            }
        });
    });

    // Time Picker Logic
    let activeTimeInput = null;
    const timePickerModal = document.getElementById('time-picker-modal-backdrop');
    const clock = document.getElementById('time-picker-clock');
    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const digitalHour = document.getElementById('digital-display-hour');
    const digitalMinute = document.getElementById('digital-display-minute');
    let currentView = 'hours'; // 'hours' or 'minutes'
    let currentHour = 12;
    let currentMinute = 0;

    function openTimePicker(targetInput) {
        activeTimeInput = targetInput;
        const timeValue = activeTimeInput.value;
        if (timeValue && timeValue.includes(':')) {
            const [h, m] = timeValue.split(':').map(Number);
            currentHour = h;
            currentMinute = m;
        } else {
            const now = new Date();
            currentHour = now.getHours();
            currentMinute = now.getMinutes();
        }
        
        switchView('hours');
        timePickerModal.classList.remove('hidden');
        setTimeout(() => timePickerModal.classList.add('visible'), 10);
    }
    
    function closeTimePicker(save = false) {
        if (save && activeTimeInput) {
            const formattedHour = String(currentHour).padStart(2, '0');
            const formattedMinute = String(currentMinute).padStart(2, '0');
            activeTimeInput.value = `${formattedHour}:${formattedMinute}`;
        }
        timePickerModal.classList.remove('visible');
        setTimeout(() => timePickerModal.classList.add('hidden'), 200);
        activeTimeInput = null;
    }

    function updateDigitalDisplay() {
        digitalHour.textContent = String(currentHour).padStart(2, '0');
        digitalMinute.textContent = String(currentMinute).padStart(2, '0');
    }

    function updateClockHands() {
        const hourDeg = (currentHour % 12) * 30 + currentMinute * 0.5;
        const minuteDeg = currentMinute * 6;
        hourHand.style.transform = `rotate(${hourDeg}deg)`;
        minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    }
    
    function switchView(view) {
        currentView = view;
        digitalHour.classList.toggle('active', view === 'hours');
        digitalMinute.classList.toggle('active', view === 'minutes');
        populateClockNumbers();
        updateDigitalDisplay();
        updateClockHands();
    }
    
    function populateClockNumbers() {
        clock.querySelectorAll('.clock-number, .clock-minute-marker').forEach(el => el.remove());
        
        if (currentView === 'hours') {
            // Outer ring (1-12)
            for (let i = 1; i <= 12; i++) {
                const angle = (i - 3) * (Math.PI / 6);
                const x = 110 * Math.cos(angle);
                const y = 110 * Math.sin(angle);
                const numberEl = document.createElement('div');
                numberEl.className = 'clock-number outer-ring';
                numberEl.textContent = String(i);
                numberEl.style.transform = `translate(${x}px, ${y}px)`;
                numberEl.dataset.value = String(i);
                clock.appendChild(numberEl);
            }
             // Inner ring (13-24)
            for (let i = 13; i <= 24; i++) {
                const hour = i === 24 ? 0 : i;
                const angle = (hour - 3) * (Math.PI / 6);
                const x = 75 * Math.cos(angle);
                const y = 75 * Math.sin(angle);
                const numberEl = document.createElement('div');
                numberEl.className = 'clock-number inner-ring';
                numberEl.textContent = String(hour);
                numberEl.style.transform = `translate(${x}px, ${y}px)`;
                numberEl.dataset.value = String(hour);
                clock.appendChild(numberEl);
            }
        } else { // Minutes view
            for (let i = 0; i < 60; i += 5) {
                const angle = (i - 15) * (Math.PI / 30);
                const x = 110 * Math.cos(angle);
                const y = 110 * Math.sin(angle);
                const markerEl = document.createElement('div');
                markerEl.className = 'clock-minute-marker';
                markerEl.textContent = String(i).padStart(2, '0');
                markerEl.style.transform = `translate(${x}px, ${y}px)`;
                markerEl.dataset.value = String(i);
                clock.appendChild(markerEl);
            }
        }
    }
    
    clock.addEventListener('click', (e) => {
        const target = e.target;
        const value = target.dataset.value;

        if (value) {
            if (currentView === 'hours') {
                currentHour = parseInt(value, 10);
                updateDigitalDisplay();
                updateClockHands();
                setTimeout(() => switchView('minutes'), 200); // Auto-switch to minutes
            } else {
                currentMinute = parseInt(value, 10);
                updateDigitalDisplay();
                updateClockHands();
                setTimeout(() => closeTimePicker(true), 200);
            }
        }
    });

    digitalHour.addEventListener('click', () => switchView('hours'));
    digitalMinute.addEventListener('click', () => switchView('minutes'));
    document.getElementById('time-picker-ok').addEventListener('click', () => closeTimePicker(true));
    document.getElementById('time-picker-cancel').addEventListener('click', () => closeTimePicker(false));
    
    // Event delegation for time picker triggers (input field or icon)
    document.body.addEventListener('click', e => {
        const target = e.target;
        const container = target.closest('.time-input-container');
        if (container) {
            const input = container.querySelector('.time-input-display');
            if (input && !input.disabled) {
                openTimePicker(input);
            }
        }
    });


    // --- INITIALIZATION ---
    loadState();
    updateSharedUI();
    showPage('page-dashboard'); // Show dashboard on load
});
