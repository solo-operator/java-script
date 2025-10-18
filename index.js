/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Global libraries (html2canvas, jspdf, Chart, XLSX) are loaded via script tags in index.html

document.addEventListener('DOMContentLoaded', function () {
    const STORAGE_KEY = 'fingerprintReportAppState';
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const HARI_KERJA_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

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
            toleransi: 15,
            jadwal: {} // Will be populated with { 'Senin': { masukReguler: '07:00', ... }, ... }
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
    let timePickerInstance = null;

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
                if (savedData.pengaturanKerja) {
                    // --- Data Migration Logic ---
                    // Check if it's the old format which had jamMasukReguler at the top level
                    if (savedData.pengaturanKerja.hasOwnProperty('jamMasukReguler')) {
                        const oldSettings = savedData.pengaturanKerja;
                        state.pengaturanKerja.hariKerja = oldSettings.hariKerja || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
                        state.pengaturanKerja.toleransi = oldSettings.toleransi || 15;
                        state.pengaturanKerja.jadwal = {}; // Initialize new structure
                        HARI_KERJA_ORDER.forEach(hari => {
                            state.pengaturanKerja.jadwal[hari] = {
                                masukReguler: oldSettings.jamMasukReguler || '07:00',
                                pulangReguler: oldSettings.jamPulangReguler || '15:00',
                                masukHonorer: oldSettings.jamMasukHonorer || '07:00',
                                pulangHonorer: oldSettings.jamPulangHonorer || '14:00',
                            };
                        });
                        console.log("Migrated old schedule settings to new daily format.");
                        saveState(); // Save the migrated state immediately
                    } else {
                        // It's the new format, load directly
                        state.pengaturanKerja = { ...state.pengaturanKerja, ...savedData.pengaturanKerja };
                    }
                }
                if (savedData.guru) state.guru = savedData.guru;
                if (savedData.absensi) state.absensi = savedData.absensi;
                if (savedData.kehadiranOverrides) state.kehadiranOverrides = savedData.kehadiranOverrides;
            } else {
                 // If no saved state, initialize the default schedule
                HARI_KERJA_ORDER.forEach(hari => {
                     state.pengaturanKerja.jadwal[hari] = {
                        masukReguler: '07:00',
                        pulangReguler: '15:00',
                        masukHonorer: '07:00',
                        pulangHonorer: '14:00',
                    };
                });
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
        if (totalMinutes === '-' || totalMinutes < 0 || !totalMinutes) {
            return '-';
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

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
                    keterangan: 'Hari Libur Sekolah'
                };
                
                const overrideKey = `${id}-${dateStr}`;
                const override = kehadiranOverrides[overrideKey];
    
                if (isHariKerja) {
                    const jadwalHariIni = pengaturanKerja.jadwal[dayName];
                    const jamMasukKerja = isHonorer ? jadwalHariIni?.masukHonorer : jadwalHariIni?.masukReguler;
                    const jamPulangKerja = isHonorer ? jadwalHariIni?.pulangHonorer : jadwalHariIni?.pulangReguler;
                    const jamMasukKerjaMin = timeToMinutes(jamMasukKerja);
                    const jamPulangKerjaMin = timeToMinutes(jamPulangKerja);
                    const toleransiMin = pengaturanKerja.toleransi;

                    dayData.jamKerjaMasuk = jamMasukKerja || '-';
                    dayData.jamKerjaPulang = jamPulangKerja || '-';
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
                            guruData.summary.hadir++;
    
                            const keterlambatan = scanMasukMin - jamMasukKerjaMin;
                            if (keterlambatan > toleransiMin) {
                                dayData.terlambat = minutesToHHMM(keterlambatan);
                                dayData.keterangan = 'Terlambat';
                                guruData.summary.terlambat++;
                                guruData.summary.totalTerlambatMenit += keterlambatan;
                            } else {
                                dayData.terlambat = '-';
                            }
                        }
    
                        if (scanKeluarMin !== null && jamPulangKerjaMin !== null) {
                            const pulangCepat = jamPulangKerjaMin - scanKeluarMin;
                            if (pulangCepat > 0) {
                                dayData.plgCpt = minutesToHHMM(pulangCepat);
                                guruData.summary.totalPlgCptMenit += pulangCepat;
                            } else {
                                dayData.plgCpt = '-';
                            }
    
                            const lembur = scanKeluarMin - jamPulangKerjaMin;
                            if (lembur > 0) {
                                dayData.lembur = minutesToHHMM(lembur);
                                guruData.summary.totalLemburMenit += lembur;
                            } else {
                                dayData.lembur = '-';
                            }
                        }
    
                        if (scanMasukMin !== null && scanKeluarMin !== null) {
                            const totalHadirMenit = scanKeluarMin - scanMasukMin;
                            if (totalHadirMenit >= 0) {
                                dayData.jmlHadir = minutesToHHMM(totalHadirMenit);
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
                 statusHtml += `<p style="margin:0; font-size: 0.85rem; color: var(--success-color);">✔️ Absen Masuk Pukul: <strong>${overrideToday.masuk}</strong></p>`;
            }
             if (overrideToday?.pulang) {
                 statusHtml += `<p style="margin:0; font-size: 0.85rem; color: var(--success-color);">✔️ Absen Pulang Pukul: <strong>${overrideToday.pulang}</strong></p>`;
            }

            if (isMasukTime) { // Mode Absen Masuk (00:00 - 12:00)
                if (overrideToday?.masuk) {
                    buttonHtml = `<button class="btn btn-secondary" disabled><i class="bi bi-hand-index-thumb"></i>Sudah Absen Masuk</button>`;
                } else {
                    buttonHtml = `<button id="btn-live-absensi" data-action="masuk" class="btn btn-primary"><i class="bi bi-hand-index-thumb"></i>Absen Masuk Sekarang</button>`;
                }
            } else { // Mode Absen Pulang (12:01 - 23:59)
                if (overrideToday?.pulang) {
                    buttonHtml = `<button class="btn btn-secondary" disabled><i class="bi bi-hand-index-thumb"></i>Sudah Absen Pulang</button>`;
                } else {
                    buttonHtml = `<button id="btn-live-absensi" data-action="pulang" class="btn btn-success"><i class="bi bi-hand-index-thumb"></i>Absen Pulang Sekarang</button>`;
                }
            }
            
            liveAbsensiHtml = `
                <div class="absen-otomatis" id="live-absensi-container" style="border: 1px solid var(--border-color); border-left: 4px solid var(--info-color); padding: 1rem; border-radius: 8px; background: #fff; flex: 1; min-width: 320px; text-align:center;box-shadow: var(--card-shadow); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <p style="margin-top: 0; margin-bottom: 0.4rem;"><i class="bi bi-alarm" style="font-size:24pt;"></i></p>
					<h4 style="margin-top: 0; margin-bottom: 0.4rem; font-size: 1rem;">Klik Absensi Hari Ini (${now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})})</h4>
                    ${buttonHtml}
                    <div style="margin-top: 0.4rem;">${statusHtml}</div>
                </div>
            `;
        }

        const guruInfoHtml = `
            <div style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="settings-section" style="padding: 1rem 1.3rem; border-left: 4px solid var(--primary-color); flex: 1; min-width: 320px; margin-bottom: 0;">
					<table style="vertical-align: top;font-weight:bold;line-height: 2;">
						<tr>
						<td>No. ID</td>
						<td>:</td>
						<td>${guru.id}</td>
						</tr>
						<tr>
						<td width="100" style="vertical-align: top;">Nama Guru</td>
						<td style="vertical-align: top;">:</td>
						<td style="vertical-align: top;">${guru.nama}</td>
						</tr>
						<tr>
						<td>Jenis Guru</td>
						<td>:</td>
						<td>${guru.jenisGuru}</td>
						</tr>
					</table>
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
            <div class="data-table-container">
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
        const { hariKerja, toleransi, jadwal } = state.pengaturanKerja;
        
        // Render Hari Kerja checkboxes
        const hariContainer = document.getElementById('hari-kerja-container');
        hariContainer.innerHTML = HARI_KERJA_ORDER.map(hari => `
            <label>
                <input type="checkbox" value="${hari}" ${hariKerja.includes(hari) ? 'checked' : ''}>
                ${hari}
            </label>
        `).join('');
    
        // Render Toleransi
        document.getElementById('toleransi-terlambat').value = toleransi.toString();
        
        // Render Jadwal Harian grid
        const jadwalContainer = document.getElementById('jadwal-harian-container');
        jadwalContainer.innerHTML = HARI_KERJA_ORDER.map(hari => {
            const jadwalHari = jadwal[hari] || { masukReguler: '', pulangReguler: '', masukHonorer: '', pulangHonorer: '' };
            const isEnabled = hariKerja.includes(hari);
    
            return `
            <div class="jadwal-hari-card ${isEnabled ? '' : 'disabled'}" data-hari="${hari}">
                <div class="jadwal-hari-header">${hari}</div>
                <div class="jadwal-hari-body">
                    <div class="form-group">
                        <label>Reguler/PNS</label>
                        <div class="form-row">
                            <div class="time-input-container">
                                <input type="text" class="time-input-display" data-jenis="masukReguler" value="${jadwalHari.masukReguler || ''}" readonly placeholder="Masuk">
                                <button type="button" class="time-picker-trigger" aria-label="Pilih Jam Masuk Reguler ${hari}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                            </div>
                            <div class="time-input-container">
                                <input type="text" class="time-input-display" data-jenis="pulangReguler" value="${jadwalHari.pulangReguler || ''}" readonly placeholder="Pulang">
                                <button type="button" class="time-picker-trigger" aria-label="Pilih Jam Pulang Reguler ${hari}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Honorer</label>
                        <div class="form-row">
                             <div class="time-input-container">
                                <input type="text" class="time-input-display" data-jenis="masukHonorer" value="${jadwalHari.masukHonorer || ''}" readonly placeholder="Masuk">
                                <button type="button" class="time-picker-trigger" aria-label="Pilih Jam Masuk Honorer ${hari}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                            </div>
                             <div class="time-input-container">
                                <input type="text" class="time-input-display" data-jenis="pulangHonorer" value="${jadwalHari.pulangHonorer || ''}" readonly placeholder="Pulang">
                                <button type="button" class="time-picker-trigger" aria-label="Pilih Jam Pulang Honorer ${hari}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    
        // Add event listeners to checkboxes to toggle card state
        hariContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const hari = checkbox.value;
                const card = jadwalContainer.querySelector(`.jadwal-hari-card[data-hari="${hari}"]`);
                if (card) {
                    card.classList.toggle('disabled', !checkbox.checked);
                }
            });
        });
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
        const p = state.pengaturanKerja;
    
        // Save selected working days
        p.hariKerja = Array.from(document.querySelectorAll('#hari-kerja-container input:checked')).map(cb => cb.value);
        
        // Save tolerance
        p.toleransi = parseInt(document.getElementById('toleransi-terlambat').value, 10) || 0;
    
        // Save daily schedules
        document.querySelectorAll('.jadwal-hari-card').forEach(card => {
            const hari = card.dataset.hari;
            if (hari && !p.jadwal[hari]) {
                p.jadwal[hari] = {}; // Ensure object exists
            }
            card.querySelectorAll('.time-input-display').forEach(input => {
                const jenis = input.dataset.jenis; // e.g., 'masukReguler'
                if (jenis) {
                    p.jadwal[hari][jenis] = input.value;
                }
            });
        });
        
        saveState();
        showCustomAlert('success', 'Berhasil', 'Jadwal & jam kerja telah disimpan.');
    }
    
    function adjustKeteranganFontSize() {
        const keteranganCells = document.querySelectorAll('.kolom-keterangan');
        keteranganCells.forEach(cell => {
            const htmlCell = cell;
            const text = htmlCell.dataset.keterangan || '';
            if (text.length > 25) {
                htmlCell.style.fontSize = '7.5pt';
            } else if (text.length > 15) {
                htmlCell.style.fontSize = '10pt';
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
                <p style="text-transform:uppercase;font-weight:bold;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td><strong>No. ID</strong></td>
					<td width="5"><strong>:</strong></td>
					<td><strong>${guru.id}</strong></td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama" width="60"><strong>Nama</strong></td>
					<td><strong>:</strong></td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 30px;">
                    <col style="width: 30px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} Hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} Kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} Hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p style="font-weight:bold;">NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p style="font-weight:bold;">NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas">
                    <p>Mengetahui,</p>
                    <p>Pengawas Sekolah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p style="font-weight:bold;">NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:32px;">${formattedFooterEndDate}</text></p>
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
                <p style="text-transform:uppercase;font-weight:bold;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td><strong>No. ID</strong></td>
					<td width="5"><strong>:</strong></td>
					<td><strong>${guru.id}</strong></td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama" width="60"><strong>Nama</strong></td>
					<td><strong>:</strong></td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 30px;">
                    <col style="width: 30px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} Hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} Kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} Hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box" style="text-align:left;width:95%;margin-left:127px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p style="font-weight:bold;">NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box" style="text-align:left;border:0px solid black;">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p style="font-weight:bold;">NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas" style="width:75%;margin-left:120px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Pengawas Madrasah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p style="font-weight:bold;">NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:32px;">${formattedFooterEndDate}</text></p>
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
                <h4 style="text-decoration:none;">LAPORAN PRESENSI KEHADIRAN</h4>
				<p style="font-weight:bold;">${s.nama.toUpperCase()}</p>
                <p style="text-transform:uppercase;font-weight:bold;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td><strong>No. ID</strong></td>
					<td width="5"><strong>:</strong></td>
					<td><strong>${guru.id}</strong></td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama-v3" width="60"><strong>Nama</strong></td>
					<td><strong>:</strong></td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                 <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 30px;">
                    <col style="width: 30px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                 <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} Hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} Kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} Hari</strong></td>
					 </tr>
                </table>
            </div>
            <div class="laporan-ttd">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p style="font-weight:bold;">NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p style="font-weight:bold;">NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas">
                    <p>Mengetahui,</p>
                    <p>Pengawas Sekolah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p style="font-weight:bold;">NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:32px;">${formattedFooterEndDate}</text></p>
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
				<tr>
					<th style="border:none;background:none;height:3px;padding:0;" colspan="11"></th>
				</tr>
            </thead>
        `;

        return `
        <div class="laporan-container" id="laporan-print-area-v4">
             <div class="laporan-title" style="margin-top:0;">
                <h4 style="text-decoration:none;">LAPORAN PRESENSI KEHADIRAN</h4>
				<p style="font-weight:bold;">${s.nama.toUpperCase()}</p>
                <p style="text-transform:uppercase;font-weight:bold;">Periode: ${monthYear}</p>
            </div>
            <div class="laporan-identitas">
                <table>
					<tr>
					<td><strong>No. ID</strong></td>
					<td width="5"><strong>:</strong></td>
					<td><strong>${guru.id}</strong></td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama-v3" width="60"><strong>Nama</strong></td>
					<td><strong>:</strong></td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table">
                <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 35px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 30px;">
                    <col style="width: 30px;">
                    <col style="width: 35px;">
                    <col style="width: 90px;">
                </colgroup>
                ${tableHeaders}
                <tbody>${rows}</tbody>
            </table>
            <div class="laporan-summary">
                 <table style="line-height:1;">
                     <tr>
					 <td>Total Kehadiran</td><td>:</td><td><strong>${data.summary.hadir} Hari</strong></td>
					 </tr>
					 <tr>
					 <td>Total Terlambat</td><td>:</td><td><strong>${data.summary.terlambat} Kali</strong></td>
					 </tr>
					 <tr>
					 <td>Total Absen</td><td>:</td><td><strong>${data.summary.absen} Hari</strong></td>
					 </tr>
                </table>
            </div>
             <div class="laporan-ttd">
                <div class="ttd-box" style="text-align:left;width:95%;margin-left:127px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <p class="nama">${s.kepsek}</p>
                    <p style="font-weight:bold;">NIP. ${s.nip}</p>
                </div>
                <div class="ttd-box" style="text-align:left;border:0px solid black;">
                    <p>${s.desa}, ${endDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</p>
                    <p>Nama ${guru.jabatan}</p>
                    <p class="nama">${guru.nama}</p>
                    <p style="font-weight:bold;">NIP. ${guru.nip || '-'}</p>
                </div>
            </div>
			<div class="laporan-ttd">
                <div class="ttd-box-pengawas" style="width:75%;margin-left:120px;border:0px solid black;">
                    <p>Mengetahui,</p>
                    <p>Pengawas Madrasah</p>
					<p>Kec. ${s.kecamatan}</p>
                    <p class="nama">${s.pengawas}</p>
                    <p style="font-weight:bold;">NIP. ${s.nipPengawas}</p>
                </div>
            </div>
            <div class="laporan-footer">
                <p>Oleh : Supervisor <br><text style="margin-left:32px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }

    // --- PDF PRINTING ---
    async function printReport(elementId, guruNama, monthYear) {
        showCustomAlert('loading', 'Mencetak Laporan', 'Harap tunggu, sedang mempersiapkan file PDF...');
        
        const { jsPDF } = window.jspdf;
        const printArea = document.getElementById(elementId);
        if (!printArea) {
            hideCustomAlert();
            showCustomAlert('error', 'Gagal', 'Area laporan tidak ditemukan.');
            return;
        }

        const allReportElements = printArea.querySelectorAll('.laporan-container');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            compress: true
        });

        try {
            for (let i = 0; i < allReportElements.length; i++) {
                const reportElement = allReportElements[i];
                const canvas = await html2canvas(reportElement, {
                    scale: 3, // Increased scale for higher resolution and sharpness
                    useCORS: true,
                    logging: false
                });

                if (i > 0) {
                    pdf.addPage();
                }

                // Use PNG for lossless quality, essential for crisp text
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                // Add image with MEDIUM compression to balance quality and file size
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'MEDIUM');
            }
            const [year, month] = monthYear.split('-');
            const dateForFilename = new Date(Date.UTC(year, parseInt(month, 10) - 1, 1));
            const formattedMonthYear = dateForFilename.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
            const cleanGuruNama = guruNama.replace(/\s*\(\d+\)$/, '').trim();
            const fileName = `Laporan Presensi - ${cleanGuruNama} - ${formattedMonthYear}.pdf`;

            pdf.save(fileName);
            hideCustomAlert();
        } catch (error) {
            console.error("Error generating PDF:", error);
            hideCustomAlert();
            showCustomAlert('error', 'Gagal Mencetak', 'Terjadi kesalahan saat membuat file PDF.');
        }
    }


    // --- EXCEL HANDLING ---
    function exportGuruToExcel() {
        const dataToExport = state.guru.map(g => ({
            ID_Unik: g.id,
            NIP: g.nip,
            Nama: g.nama,
            Jabatan: g.jabatan,
            Jenis_Guru: g.jenisGuru,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");
        XLSX.writeFile(workbook, "Data_Guru.xlsx");
        showCustomAlert('success', 'Berhasil', 'Data guru telah diekspor ke file Excel.');
    }

    function importGuruFromExcel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                const importedGuru = [];
                const existingIds = new Set(state.guru.map(g => g.id));

                jsonData.forEach(row => {
                    const id = row.ID_Unik?.toString().trim();
                    const nama = row.Nama?.toString().trim();
                    if (id && nama && !existingIds.has(id)) {
                        importedGuru.push({
                            id: id,
                            nip: row.NIP?.toString().trim() || '',
                            nama: nama,
                            jabatan: row.Jabatan?.toString().trim() || '',
                            jenisGuru: row.Jenis_Guru === 'Honorer' ? 'Honorer' : 'Reguler/PNS'
                        });
                        existingIds.add(id); // Prevent duplicates within the same file
                    }
                });

                state.guru = [...state.guru, ...importedGuru];
                saveState();
                renderGuruPage();
                renderDashboard();
                showCustomAlert('success', 'Impor Berhasil', `${importedGuru.length} data guru baru telah ditambahkan.`);
            } catch (error) {
                showCustomAlert('error', 'Gagal Impor', 'Terjadi kesalahan saat membaca file. Pastikan format file dan nama kolom sudah benar.');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    function downloadGuruTemplate() {
        const templateData = [{
            ID_Unik: "101",
            NIP: "198501012010011001",
            Nama: "Budi Santoso",
            Jabatan: "Guru TIK",
            Jenis_Guru: "Reguler/PNS"
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
        XLSX.writeFile(wb, "Template_Import_Guru.xlsx");
    }

    function downloadAbsensiTemplate() {
        const wb = XLSX.utils.book_new();
        state.guru.forEach(guru => { // Create template for all teachers
            const sheetName = `${guru.nama.substring(0, 20)} (${guru.id})`.replace(/[\\/?*\[\]]/g, ''); // Make sheet name valid
            const templateData = [{
                Tanggal: "YYYY-MM-DD",
                Jam_Masuk: "HH:MM",
                Jam_Pulang: "HH:MM",
                Keterangan: "Sakit/Izin/Dinas Luar"
            }];
            const ws = XLSX.utils.json_to_sheet(templateData);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        XLSX.writeFile(wb, "Template_Import_Absensi_Massal.xlsx");
    }

    function importAbsensiFromExcel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                let importedCount = 0;
                let errorSheets = [];

                workbook.SheetNames.forEach(sheetName => {
                    const match = sheetName.match(/\((\d+)\)$/);
                    if (match && match[1]) {
                        const guruId = match[1];
                        if (state.guru.some(g => g.id === guruId)) {
                            const ws = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(ws, { raw: false }); // raw: false to get formatted strings
                            jsonData.forEach(row => {
                                const tanggal = row.Tanggal?.toString().trim();
                                if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
                                     const overrideKey = `${guruId}-${tanggal}`;
                                     state.kehadiranOverrides[overrideKey] = {
                                        masuk: row.Jam_Masuk?.toString().trim() || '',
                                        pulang: row.Jam_Pulang?.toString().trim() || '',
                                        keterangan: row.Keterangan?.toString().trim() || ''
                                     };
                                     importedCount++;
                                }
                            });
                        } else {
                            errorSheets.push(sheetName);
                        }
                    }
                });
                
                saveState();
                
                // Refresh the form if it's currently displayed
                const displayedGuruId = document.getElementById('manual-absensi-guru')?.value;
                if (displayedGuruId) {
                    const monthYear = document.getElementById('manual-absensi-bulan').value;
                    generateManualAbsensiForm(displayedGuruId, monthYear);
                }

                let message = `${importedCount} data kehadiran berhasil diimpor.`;
                if (errorSheets.length > 0) {
                    message += `\nSheet berikut dilewati karena ID Guru tidak ditemukan: ${errorSheets.join(', ')}.`;
                }
                showCustomAlert('success', 'Impor Selesai', message);

            } catch (error) {
                console.error(error);
                showCustomAlert('error', 'Gagal Impor', 'Terjadi kesalahan saat membaca file. Pastikan format file, nama sheet, dan nama kolom sudah benar.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // --- BACKUP & RESTORE ---
    function backupData() {
        try {
            const dataToSave = {
                sekolah: state.sekolah,
                pengaturanKerja: state.pengaturanKerja,
                guru: state.guru,
                absensi: state.absensi,
                kehadiranOverrides: state.kehadiranOverrides
            };
            const jsonString = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `Backup_Absensi_Guru_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showCustomAlert('success', 'Backup Berhasil', 'File backup telah diunduh.');
        } catch (e) {
            showCustomAlert('error', 'Gagal Backup', 'Terjadi kesalahan saat membuat file backup.');
        }
    }
    
    function restoreData(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const confirmed = await showCustomConfirm(
                'Konfirmasi Restore',
                'Apakah Anda yakin? Tindakan ini akan <strong>menimpa seluruh data saat ini</strong> dengan data dari file backup.',
                'Ya, Timpa Data'
            );
            if (!confirmed) return;
            
            try {
                const restoredData = JSON.parse(e.target.result);
                // Basic validation
                if (restoredData.sekolah && restoredData.guru && restoredData.pengaturanKerja) {
                    state.sekolah = restoredData.sekolah;
                    state.pengaturanKerja = restoredData.pengaturanKerja;
                    state.guru = restoredData.guru;
                    state.absensi = restoredData.absensi || [];
                    state.kehadiranOverrides = restoredData.kehadiranOverrides || {};
                    saveState();
                    showCustomAlert('success', 'Restore Berhasil', 'Data telah dipulihkan. Halaman akan dimuat ulang.');
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    throw new Error("Invalid file format");
                }
            } catch (error) {
                showCustomAlert('error', 'Gagal Restore', 'File backup tidak valid atau rusak.');
            }
        };
        reader.readAsText(file);
    }
    
    async function resetApp() {
        const confirmed = await showCustomConfirm(
            'Konfirmasi Reset',
            '<strong>PERINGATAN!</strong> Anda akan menghapus <strong>SEMUA</strong> data aplikasi secara permanen. Tindakan ini tidak dapat diurungkan. Yakin ingin melanjutkan?',
            'Ya, Hapus Semua'
        );
        if (confirmed) {
            localStorage.removeItem(STORAGE_KEY);
            showCustomAlert('success', 'Reset Berhasil', 'Aplikasi telah dikembalikan ke pengaturan awal. Halaman akan dimuat ulang.');
            setTimeout(() => window.location.reload(), 2000);
        }
    }


    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Navigation
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const pageId = btn.id.replace('btn-', 'page-');
                showPage(pageId);
                if (window.innerWidth <= 992) {
                    body.classList.remove('mobile-nav-open');
                }
            });
        });
        
        mobileMenuToggle.addEventListener('click', () => body.classList.add('mobile-nav-open'));
        mobileMenuClose.addEventListener('click', () => body.classList.remove('mobile-nav-open'));
        
        // Sidebar Toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            body.classList.toggle('sidebar-minimized');
        });

        // Identitas Page
        document.getElementById('form-identitas').addEventListener('submit', (e) => {
            e.preventDefault();
            saveIdentitas();
        });
        handleImageUpload(document.getElementById('sekolah-logo'), document.getElementById('logo-preview'), (base64) => {
            state.sekolah.logo = base64;
        });

        // Jadwal Page
        document.getElementById('form-jadwal').addEventListener('submit', (e) => {
            e.preventDefault();
            saveJadwal();
        });
        
        // Guru Page
        document.getElementById('btn-input-guru-baru').addEventListener('click', () => openGuruModal());
        document.getElementById('btn-save-guru').addEventListener('click', saveGuru);
        document.getElementById('btn-close-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
        
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
        
        document.getElementById('daftar-guru-container').addEventListener('click', async (e) => {
            const target = e.target;
            const btnEdit = target.closest('.btn-edit');
            const btnDelete = target.closest('.btn-delete');
            const checkbox = target.closest('.guru-checkbox');
            const row = target.closest('tr');

            if (btnEdit) {
                openGuruModal(btnEdit.dataset.id);
            }
            if (btnDelete) {
                const guruId = btnDelete.dataset.id;
                const guru = state.guru.find(g => g.id === guruId);
                const confirmed = await showCustomConfirm('Hapus Guru', `Yakin ingin menghapus guru <strong>${guru.nama}</strong>?`);
                if (confirmed) {
                    deleteGuru(guruId);
                    showCustomAlert('success', 'Berhasil', 'Data guru telah dihapus.');
                }
            }
            if (checkbox) {
                const id = checkbox.dataset.id;
                if (checkbox.checked) {
                    state.ui.guru.selectedIds.add(id);
                } else {
                    state.ui.guru.selectedIds.delete(id);
                }
                updateBulkActionsGuru();
                row.classList.toggle('selected', checkbox.checked);
                 // Also update the "select all" checkbox state
                renderGuruList(); // Re-render to correctly update "select all"
            }
        });

        document.getElementById('btn-delete-selected-guru').addEventListener('click', async () => {
            const count = state.ui.guru.selectedIds.size;
            const confirmed = await showCustomConfirm('Hapus Guru Terpilih', `Yakin ingin menghapus <strong>${count} guru</strong> yang terpilih?`);
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
        
        // Guru Import/Export
        document.getElementById('btn-import-guru').addEventListener('click', () => document.getElementById('import-guru-modal').classList.remove('hidden'));
        document.getElementById('btn-close-import-guru-modal').addEventListener('click', () => document.getElementById('import-guru-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-import-guru-modal').addEventListener('click', () => document.getElementById('import-guru-modal').classList.add('hidden'));
        document.getElementById('btn-download-template-guru').addEventListener('click', downloadGuruTemplate);
        document.getElementById('btn-confirm-import-guru').addEventListener('click', () => {
            const fileInput = document.getElementById('import-guru-file-input');
            if (fileInput.files.length > 0) {
                importGuruFromExcel(fileInput.files[0]);
                document.getElementById('import-guru-modal').classList.add('hidden');
            } else {
                showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file Excel untuk diimpor.');
            }
        });
        document.getElementById('btn-export-guru').addEventListener('click', exportGuruToExcel);

        // Manual Absensi
        document.getElementById('btn-tampilkan-manual-absensi').addEventListener('click', () => {
            const guruId = document.getElementById('manual-absensi-guru').value;
            const monthYear = document.getElementById('manual-absensi-bulan').value;
            if (guruId && monthYear) {
                generateManualAbsensiForm(guruId, monthYear);
            } else {
                showCustomAlert('warning', 'Data Belum Lengkap', 'Silakan pilih guru dan periode bulan terlebih dahulu.');
            }
        });

        document.getElementById('manual-absensi-form-container').addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('manual-keterangan')) {
                const tr = target.closest('tr');
                const masukInput = tr.querySelector('td:nth-child(3) .manual-jam');
                const pulangInput = tr.querySelector('td:nth-child(4) .manual-jam');
                const timeTriggers = tr.querySelectorAll('.time-picker-trigger');

                if (target.value.trim() !== '') {
                    masukInput.value = '';
                    pulangInput.value = '';
                    masukInput.disabled = true;
                    pulangInput.disabled = true;
                    timeTriggers.forEach(btn => btn.disabled = true);
                    tr.classList.add('holiday-row');
                } else {
                    masukInput.disabled = false;
                    pulangInput.disabled = false;
                     timeTriggers.forEach(btn => btn.disabled = false);
                    tr.classList.remove('holiday-row');
                }
            }
        });
        
        document.getElementById('manual-absensi-form-container').addEventListener('click', async (e) => {
            const target = e.target;
            const guruId = document.getElementById('manual-absensi-guru').value;
            
            // Simpan perubahan
            if (target.closest('#btn-simpan-manual-absensi')) {
                document.querySelectorAll('#manual-absensi-form-container tbody tr').forEach(tr => {
                    const date = tr.dataset.date;
                    const overrideKey = `${guruId}-${date}`;
                    
                    const masuk = tr.querySelector('td:nth-child(3) .manual-jam').value;
                    const pulang = tr.querySelector('td:nth-child(4) .manual-jam').value;
                    const keterangan = tr.querySelector('td:nth-child(5) .manual-keterangan').value;
                    
                    if (masuk || pulang || keterangan) {
                        state.kehadiranOverrides[overrideKey] = { masuk, pulang, keterangan };
                    } else {
                        delete state.kehadiranOverrides[overrideKey]; // Clean up empty entries
                    }
                });
                saveState();
                showCustomAlert('success', 'Berhasil', 'Data kehadiran manual telah disimpan.');
            }

            // Reset semua isian
            if (target.closest('#btn-reset-manual-absensi')) {
                const confirmed = await showCustomConfirm(
                    'Reset Isian?',
                    'Anda yakin ingin mereset semua isian pada halaman ini? Perubahan yang belum disimpan akan hilang.',
                    'Ya, Reset'
                );
                if (confirmed) {
                    const monthYear = document.getElementById('manual-absensi-bulan').value;
                    generateManualAbsensiForm(guruId, monthYear);
                }
            }

            // Reset isian harian
            if (target.closest('.btn-reset-harian')) {
                const tr = target.closest('tr');
                const date = tr.dataset.date;
                const overrideKey = `${guruId}-${date}`;
                let wasReset = false;

                // Check if there are unsaved changes in the DOM
                const masukInput = tr.querySelector('td:nth-child(3) .manual-jam');
                const pulangInput = tr.querySelector('td:nth-child(4) .manual-jam');
                const keteranganInput = tr.querySelector('td:nth-child(5) .manual-keterangan');

                if (masukInput.value || pulangInput.value || keteranganInput.value) {
                    wasReset = true;
                }

                // Also check if there is saved data to be cleared
                if (state.kehadiranOverrides[overrideKey]) {
                    delete state.kehadiranOverrides[overrideKey];
                    saveState();
                    wasReset = true;
                }
                
                // Only proceed if there was something to reset (either in DOM or state)
                if (wasReset) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const monthYear = document.getElementById('manual-absensi-bulan').value;

                    // If today's date is reset, regenerate the whole form to update the live attendance section
                    if (date === todayStr) {
                        generateManualAbsensiForm(guruId, monthYear);
                    } else {
                        // Just reset this one row in the DOM for better UX if it's not today
                        masukInput.value = '';
                        pulangInput.value = '';
                        keteranganInput.value = '';
                        tr.querySelectorAll('input, button, textarea').forEach(el => el.disabled = false);
                        tr.classList.remove('holiday-row');
                    }
                    const formattedDateForAlert = new Date(date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
                    showCustomAlert('success', 'Reset Berhasil', `Data isian untuk tanggal ${formattedDateForAlert} telah direset.`);
                }
            }
             // Live absensi button
            if (target.closest('#btn-live-absensi')) {
                const button = target.closest('#btn-live-absensi');
                const action = button.dataset.action;
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const dateStr = now.toISOString().slice(0, 10);
                const overrideKey = `${guruId}-${dateStr}`;

                if (!state.kehadiranOverrides[overrideKey]) {
                    state.kehadiranOverrides[overrideKey] = { masuk: '', pulang: '', keterangan: '' };
                }

                if (action === 'masuk') {
                    state.kehadiranOverrides[overrideKey].masuk = timeStr;
                } else {
                    state.kehadiranOverrides[overrideKey].pulang = timeStr;
                }
                
                saveState();
                const monthYear = document.getElementById('manual-absensi-bulan').value;
                generateManualAbsensiForm(guruId, monthYear); // Re-render to show updated status
                showCustomAlert('success', 'Berhasil', `Absen ${action} pada pukul ${timeStr} telah dicatat.`);
            }
        });
        
        // Absensi Import
        document.getElementById('btn-import-absensi').addEventListener('click', () => document.getElementById('import-absensi-modal').classList.remove('hidden'));
        document.getElementById('btn-close-import-absensi-modal').addEventListener('click', () => document.getElementById('import-absensi-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-import-absensi-modal').addEventListener('click', () => document.getElementById('import-absensi-modal').classList.add('hidden'));
        document.getElementById('btn-download-template-absensi').addEventListener('click', downloadAbsensiTemplate);
        document.getElementById('btn-confirm-import-absensi').addEventListener('click', () => {
             const fileInput = document.getElementById('import-absensi-file-input');
            if (fileInput.files.length > 0) {
                importAbsensiFromExcel(fileInput.files[0]);
                document.getElementById('import-absensi-modal').classList.add('hidden');
            } else {
                showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file Excel untuk diimpor.');
            }
        });

        // Cetak Page Listeners (for all 4 versions)
        document.getElementById('btn-tampilkan-laporan').addEventListener('click', tampilkanLaporan);
        document.getElementById('btn-tampilkan-laporan-v2').addEventListener('click', tampilkanLaporanV2);
        document.getElementById('btn-tampilkan-laporan-v3').addEventListener('click', tampilkanLaporanV3);
        document.getElementById('btn-tampilkan-laporan-v4').addEventListener('click', tampilkanLaporanV4);

        document.getElementById('btn-print-laporan').addEventListener('click', () => {
            const guruSelect = document.getElementById('cetak-pilih-guru');
            const guruNama = guruSelect.options[guruSelect.selectedIndex].text;
            const monthYear = document.getElementById('cetak-pilih-bulan').value;
            printReport('laporan-pratinau-wrapper', guruNama, monthYear);
        });
        document.getElementById('btn-print-laporan-v2').addEventListener('click', () => {
            const guruSelect = document.getElementById('cetak-pilih-guru-v2');
            const guruNama = guruSelect.options[guruSelect.selectedIndex].text;
            const monthYear = document.getElementById('cetak-pilih-bulan-v2').value;
            printReport('laporan-pratinau-wrapper-v2', guruNama, monthYear);
        });
        document.getElementById('btn-print-laporan-v3').addEventListener('click', () => {
            const guruSelect = document.getElementById('cetak-pilih-guru-v3');
            const guruNama = guruSelect.options[guruSelect.selectedIndex].text;
            const monthYear = document.getElementById('cetak-pilih-bulan-v3').value;
            printReport('laporan-pratinau-wrapper-v3', guruNama, monthYear);
        });
        document.getElementById('btn-print-laporan-v4').addEventListener('click', () => {
            const guruSelect = document.getElementById('cetak-pilih-guru-v4');
            const guruNama = guruSelect.options[guruSelect.selectedIndex].text;
            const monthYear = document.getElementById('cetak-pilih-bulan-v4').value;
            printReport('laporan-pratinau-wrapper-v4', guruNama, monthYear);
        });

        document.getElementById('btn-cancel-multi-print').addEventListener('click', () => {
            state.ui.cetak.selectedIds = [];
            renderCetakPage();
        });
        document.getElementById('btn-cancel-multi-print-v2').addEventListener('click', () => {
            state.ui.cetakV2.selectedIds = [];
            renderCetakPageV2();
        });
        document.getElementById('btn-cancel-multi-print-v3').addEventListener('click', () => {
            state.ui.cetakV3.selectedIds = [];
            renderCetakPageV3();
        });
         document.getElementById('btn-cancel-multi-print-v4').addEventListener('click', () => {
            state.ui.cetakV4.selectedIds = [];
            renderCetakPageV4();
        });

        // Backup & Restore Page
        document.getElementById('btn-backup-data').addEventListener('click', backupData);
        document.getElementById('btn-restore-data').addEventListener('click', () => {
            document.getElementById('restore-file-input').click();
        });
        document.getElementById('restore-file-input').addEventListener('change', (e) => {
            restoreData(e.target.files[0]);
            e.target.value = ''; // Reset input
        });
        document.getElementById('btn-reset-app').addEventListener('click', resetApp);
        
        // Time Picker Event Delegation
        document.addEventListener('click', e => {
            const trigger = e.target.closest('.time-picker-trigger, .time-input-display');
            if (trigger) {
                const container = trigger.closest('.time-input-container');
                if (container) {
                    const input = container.querySelector('.time-input-display');
                    if (input && !input.disabled) {
                        timePickerInstance.show(input);
                    }
                }
            }
        });
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        updateSharedUI();
        timePickerInstance = new TimePicker();
        setupEventListeners();
        showPage('page-dashboard');
    }

    // --- TIME PICKER CLASS ---
    class TimePicker {
        constructor() {
            this.modalBackdrop = document.getElementById('time-picker-modal-backdrop');
            this.modal = document.getElementById('time-picker-modal');
            this.hourDisplay = document.getElementById('digital-display-hour');
            this.minuteDisplay = document.getElementById('digital-display-minute');
            this.clock = document.getElementById('time-picker-clock');
            this.hourHand = document.getElementById('hour-hand');
            this.minuteHand = document.getElementById('minute-hand');
            this.okButton = document.getElementById('time-picker-ok');
            this.cancelButton = document.getElementById('time-picker-cancel');
            
            this.currentInput = null;
            this.isHourView = true;
            this.hour = 12;
            this.minute = 0;
            this.isDragging = false;
            
            this.createClockNumbers();
            this.bindEvents();
        }

        createClockNumbers() {
            const radius = 114;
            const innerRadius = 76;
            
            // Outer hours (1-12)
            for (let i = 1; i <= 12; i++) {
                const angle = (i - 3) * 30 * (Math.PI / 180);
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                const num = document.createElement('div');
                num.className = 'clock-number outer-ring';
                num.textContent = i;
                num.style.transform = `translate(${x}px, ${y}px)`;
                num.dataset.value = i;
                num.dataset.type = 'hour';
                this.clock.appendChild(num);
            }

            // Inner hours (13-23, 00)
            for (let i = 13; i <= 23; i++) {
                const angle = (i - 15) * 30 * (Math.PI / 180);
                const x = innerRadius * Math.cos(angle);
                const y = innerRadius * Math.sin(angle);
                const num = document.createElement('div');
                num.className = 'clock-number inner-ring';
                num.textContent = i;
                num.style.transform = `translate(${x}px, ${y}px)`;
                num.dataset.value = i;
                num.dataset.type = 'hour';
                this.clock.appendChild(num);
            }
            // Add 00
            const zeroAngle = (12 - 15) * 30 * (Math.PI / 180);
            const zeroX = innerRadius * Math.cos(zeroAngle);
            const zeroY = innerRadius * Math.sin(zeroAngle);
            const zeroNum = document.createElement('div');
            zeroNum.className = 'clock-number inner-ring';
            zeroNum.textContent = '00';
            zeroNum.style.transform = `translate(${zeroX}px, ${zeroY}px)`;
            zeroNum.dataset.value = 0;
            zeroNum.dataset.type = 'hour';
            this.clock.appendChild(zeroNum);

            // Minutes
            for (let i = 0; i < 12; i++) {
                const value = (i * 5);
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = radius * Math.cos(angle); // Place minutes on the outer ring for easier selection
                const y = radius * Math.sin(angle);
                const num = document.createElement('div');
                num.className = 'clock-minute-marker';
                num.textContent = String(value).padStart(2,'0');
                num.style.transform = `translate(${x}px, ${y}px)`;
                num.dataset.value = value;
                num.dataset.type = 'minute';
                this.clock.appendChild(num);
            }
        }

        bindEvents() {
            this.okButton.addEventListener('click', () => this.onOk());
            this.cancelButton.addEventListener('click', () => this.hide());
            this.modalBackdrop.addEventListener('click', (e) => {
                if (e.target === this.modalBackdrop) this.hide();
            });
            this.hourDisplay.addEventListener('click', () => this.setView('hour'));
            this.minuteDisplay.addEventListener('click', () => this.setView('minute'));

            this.clock.addEventListener('mousedown', this.startDrag.bind(this));
            window.addEventListener('mousemove', this.onDrag.bind(this));
            window.addEventListener('mouseup', this.endDrag.bind(this));

            this.clock.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]), { passive: false });
            window.addEventListener('touchmove', (e) => this.onDrag(e.touches[0]), { passive: false });
            window.addEventListener('touchend', this.endDrag.bind(this));
        }
        
        startDrag(e) {
            e.preventDefault();
            this.isDragging = true;
            this.onDrag(e, true);
        }

        onDrag(e, isClick = false) {
            if (!this.isDragging && !isClick) return;
            if (e.preventDefault) e.preventDefault();

            const rect = this.clock.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const x = e.clientX - rect.left - centerX;
            const y = e.clientY - rect.top - centerY;
            
            let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;

            if (this.isHourView) {
                const dist = Math.sqrt(x*x + y*y);
                const threshold = 95; // Midpoint between inner (76) and outer (114) radii
                const baseHour = Math.round(angle / 30);
                
                let hour;
                if (dist > threshold) { // Outer ring: 1-12
                    hour = baseHour === 0 ? 12 : baseHour;
                } else { // Inner ring: 13-23, 00
                    hour = baseHour === 0 ? 0 : baseHour + 12;
                }
                this.setHour(hour);
            } else {
                const minute = Math.round(angle / 6);
                this.setMinute(minute % 60);
            }
        }
        
        endDrag() {
            if (this.isDragging) {
                this.isDragging = false;
                if (this.isHourView) {
                    setTimeout(() => this.setView('minute'), 150);
                }
            }
        }

        show(inputElement) {
            this.currentInput = inputElement;
            const timeValue = this.currentInput.value || "07:00";
            const [h, m] = timeValue.split(':').map(Number);
            this.hour = isNaN(h) ? 7 : h;
            this.minute = isNaN(m) ? 0 : m;
            this.setView('hour');
            this.updateDisplay();
            this.modalBackdrop.classList.remove('hidden');
            setTimeout(() => this.modalBackdrop.classList.add('visible'), 10);
        }

        hide() {
            this.modalBackdrop.classList.remove('visible');
            setTimeout(() => this.modalBackdrop.classList.add('hidden'), 200);
        }

        setView(view) {
            this.isHourView = (view === 'hour');
            this.hourDisplay.classList.toggle('active', this.isHourView);
            this.minuteDisplay.classList.toggle('active', !this.isHourView);
            this.hourHand.style.display = this.isHourView ? 'block' : 'none';
            this.minuteHand.style.display = !this.isHourView ? 'block' : 'none';
            
            this.clock.querySelectorAll('.clock-number, .clock-minute-marker').forEach(el => {
                el.style.display = 'flex';
            });
            if (this.isHourView) {
                this.clock.querySelectorAll('.clock-minute-marker').forEach(el => el.style.display = 'none');
            } else {
                this.clock.querySelectorAll('.clock-number').forEach(el => el.style.display = 'none');
            }

            this.updateHandPositions();
        }

        setHour(hour) {
            this.hour = hour;
            this.updateDisplay();
            this.updateHandPositions();
        }
        
        setMinute(minute) {
            this.minute = minute;
            this.updateDisplay();
            this.updateHandPositions();
        }

        updateDisplay() {
            this.hourDisplay.textContent = String(this.hour).padStart(2, '0');
            this.minuteDisplay.textContent = String(this.minute).padStart(2, '0');
        }

        updateHandPositions() {
            const hourForAngle = this.hour % 12;
            const hourAngle = hourForAngle * 30 + (this.minute / 60) * 30;
            const minuteAngle = this.minute * 6;
            
            this.hourHand.style.transform = `rotate(${hourAngle}deg)`;
            this.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;

            // Adjust hand length for inner/outer rings
            const isInnerRing = this.hour === 0 || this.hour > 12;
            this.hourHand.style.height = isInnerRing ? '70px' : '90px';
        }
        
        onOk() {
            if (this.currentInput) {
                this.currentInput.value = `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
            }
            this.hide();
        }
    }

    init();
});
