/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

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
        alertMessage.textContent = message;

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
            alertMessage.textContent = message;
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
        Object.values(processedData).forEach(guruData => {
            Object.values(guruData.days).forEach(dayData => {
                if (dayData.keterangan === 'Hadir' || dayData.keterangan === 'Terlambat') {
                    hadirCount++;
                }
            });
        });
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
        
        Object.values(processedData).forEach(guruData => {
            absenCount += guruData.summary.absen;
            terlambatCount += guruData.summary.terlambat;
        });
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
            printBtn.querySelector('span').textContent = `Cetak (${count})`;
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    // --- SET MANUAL KEHADIRAN PAGE ---
    function renderAbsensiPage() {
        const guruSelect = document.getElementById('manual-absensi-guru');
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

        const guruInfoHtml = `
            <div class="settings-section" style="padding: 1rem 1.5rem; margin-bottom: 1rem; border-left: 4px solid var(--primary-color);">
                <div style="font-size: 0.95rem; line-height: 1.5;">
                    <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">No. ID</strong>: ${guru.id}</div>
                    <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">Nama Guru</strong>: ${guru.nama}</div>
                    <div style="display: flex;"><strong style="width: 100px; flex-shrink: 0;">Jenis Guru</strong>: ${guru.jenisGuru}</div>
                </div>
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
					<th style="border:none;background:none;height:3px;padding:0;"> </th>
				</tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area-v3">
            <div class="laporan-title" style="margin-top:0;">
                <h4 style="text-decoration:none;">LAPORAN PRESENSI KEHADIRAN</h4>
				<h4 style="text-decoration:none;text-transform:uppercase;font-weight:bold;">${s.nama}</h4>
                <h4 style="text-decoration:none;text-transform:uppercase;">Periode: ${monthYear}</h4>
            </div>
            <div class="laporan-identitas" style="margin-top:30px;">
                <table>
					<tr>
					<td>No. ID</td>
					<td width="5">:</td>
					<td>${guru.id}</td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama-v3" width="62">Nama</td>
					<td>:</td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table" style="font-size:9pt;">
                <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 30px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 33px;">
                    <col style="width: 33px;">
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
            <div class="laporan-footer" style="margin-top:2rem;">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }
    
    // --- NEW FUNCTION: generateReportHTML_V4 (Tanpa Kop) ---
    function generateReportHTML_V4(guru, data, startDate, endDate, pageNumber) {
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
					<th style="border:none;background:none;height:3px;padding:0;"> </th>
				</tr>
            </thead>
        `;
        
        return `
        <div class="laporan-container" id="laporan-print-area-v4">
            <div class="laporan-title" style="margin-top:0;">
                <h4 style="text-decoration:none;">LAPORAN PRESENSI KEHADIRAN</h4>
				<h4 style="text-decoration:none;text-transform:uppercase;font-weight:bold;">${s.nama}</h4>
                <h4 style="text-decoration:none;text-transform:uppercase;">Periode: ${monthYear}</h4>
            </div>
            <div class="laporan-identitas" style="margin-top:30px;">
                <table>
					<tr>
					<td>No. ID</td>
					<td width="5">:</td>
					<td>${guru.id}</td>
					<td width="250" style="text-align:center;">Periode Waktu</td>
					</tr>
                    <tr>
					<td class="laporan-identitas-nama-v3" width="62">Nama</td>
					<td>:</td>
					<td><strong>${guru.nama}</strong></td>
					<td style="text-align:center;">Dari ${formattedStartDate} s/d ${formattedEndDate}</td>
					</tr>
                </table>
            </div>
            <table class="laporan-table" style="font-size:9pt;">
                <colgroup>
                    <col style="width: 40px;">
                    <col style="width: 30px;">
                    <col style="width: 40px;">
                    <col style="width: 40px;">
                    <col style="width: 42px;">
                    <col style="width: 42px;">
                    <col style="width: 35px;">
                    <col style="width: 33px;">
                    <col style="width: 33px;">
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
            <div class="laporan-footer" style="margin-top:2rem;">
                <p>Oleh : Supervisor <br><text style="margin-left:26px;">${formattedFooterEndDate}</text></p>
                <p>Hal. ${pageNumber}</p>
            </div>
        </div>
        `;
    }

    // --- BUSINESS LOGIC: ABSENSI PROCESSING ---
    function processAbsensi(absensi, idList, startDate, endDate) {
        const { hariKerja, jamMasukReguler, jamPulangReguler, jamMasukHonorer, jamPulangHonorer, toleransi } = state.pengaturanKerja;

        const result = {};
        idList.forEach(id => {
            const guru = state.guru.find(g => g.id === id);
            result[id] = {
                guru: guru,
                days: {},
                summary: { hadir: 0, terlambat: 0, absen: 0 }
            };
        });
        
        const absensiByIdAndDay = {};
        absensi.forEach(a => {
            const dateStr = a.timestamp.slice(0, 10);
            if (!absensiByIdAndDay[a.id]) absensiByIdAndDay[a.id] = {};
            if (!absensiByIdAndDay[a.id][dateStr]) absensiByIdAndDay[a.id][dateStr] = [];
            absensiByIdAndDay[a.id][dateStr].push(new Date(a.timestamp));
        });

        for (let d = new Date(startDate.getTime()); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            const dayName = HARI[d.getUTCDay()];
            const isHariKerja = hariKerja.includes(dayName);

            idList.forEach(id => {
                const guru = result[id].guru;
                if (!guru) return;

                const isReguler = guru.jenisGuru === 'Reguler/PNS';
                const jamKerjaMasuk = isReguler ? jamMasukReguler : jamMasukHonorer;
                const jamKerjaPulang = isReguler ? jamPulangReguler : jamPulangHonorer;
                
                const timeToDate = (timeStr) => timeStr ? new Date(`1970-01-01T${timeStr}Z`) : null; // Use UTC
                const formatTime = (dateObj) => dateObj ? dateObj.toUTCString().slice(17, 22) : '-'; // Format from UTC as HH:mm
                
                const jamKerjaMasukDate = timeToDate(jamKerjaMasuk);
                const jamKerjaPulangDate = timeToDate(jamKerjaPulang);

                const overrideKey = `${id}-${dateStr}`;
                const override = state.kehadiranOverrides[overrideKey];
                const dayScans = absensiByIdAndDay[id]?.[dateStr]?.sort((a,b) => a.getTime() - b.getTime());
                
                const dayResult = {
                    jamKerjaMasuk: jamKerjaMasuk || '-',
                    jamKerjaPulang: jamKerjaPulang || '-',
                    scanMasuk: '-', scanKeluar: '-', terlambat: '-', plgCpt: '-',
                    lembur: '-', jmlHadir: '-', keterangan: ''
                };
                
                if (!isHariKerja) {
                    dayResult.keterangan = 'Hari Libur Sekolah';
                } else if (override && override.keterangan) {
                    dayResult.keterangan = override.keterangan;
                    if (['ALPHA', 'ABSEN'].includes(dayResult.keterangan.toUpperCase())) {
                        result[id].summary.absen++;
                    }
                } else {
                    let scanMasuk, scanKeluar;

                    if (override && (override.masuk || override.pulang)) {
                        scanMasuk = timeToDate(override.masuk);
                        scanKeluar = timeToDate(override.pulang);
                    } else if (dayScans && dayScans.length > 0) {
                        scanMasuk = dayScans[0];
                        if (dayScans.length > 1) {
                            scanKeluar = dayScans[dayScans.length - 1];
                        }
                    }

                    if (scanMasuk) {
                        result[id].summary.hadir++;
                        dayResult.scanMasuk = formatTime(scanMasuk);
                        dayResult.keterangan = 'Hadir';
                        
                        if (jamKerjaMasukDate) {
                            const scanMasukTime = timeToDate(scanMasuk.toUTCString().slice(17, 25));
                            const lateMinutes = Math.round((scanMasukTime.getTime() - jamKerjaMasukDate.getTime()) / 60000);
                            if (lateMinutes > toleransi) {
                                dayResult.terlambat = minutesToHHMM(lateMinutes);
                                dayResult.keterangan = 'Terlambat';
                                result[id].summary.terlambat++;
                            }
                        }
                    } else {
                        dayResult.keterangan = 'ABSEN';
                        result[id].summary.absen++;
                    }
                    
                    if (scanKeluar) {
                        dayResult.scanKeluar = formatTime(scanKeluar);
                        if (jamKerjaPulangDate) {
                             const scanKeluarTime = timeToDate(scanKeluar.toUTCString().slice(17, 25));
                             const timeDiffMinutes = Math.round((scanKeluarTime.getTime() - jamKerjaPulangDate.getTime()) / 60000);
                             if (timeDiffMinutes < 0) {
                                dayResult.plgCpt = minutesToHHMM(-timeDiffMinutes);
                             } else if (timeDiffMinutes > 0) {
                                dayResult.lembur = minutesToHHMM(timeDiffMinutes);
                             }
                        }
                    }

                    if (scanMasuk && scanKeluar) {
                         const workDurationMs = scanKeluar.getTime() - scanMasuk.getTime();
                         if (workDurationMs > 0) {
                            const totalMinutes = Math.round(workDurationMs / 60000);
                            dayResult.jmlHadir = minutesToHHMM(totalMinutes);
                         }
                    }
                }
                
                result[id].days[dateStr] = dayResult;
            });
        }
        return result;
    }
    
    function adjustKeteranganFontSize() {
        const cells = document.querySelectorAll('.laporan-table .kolom-keterangan');
        cells.forEach((cell) => {
            cell.style.fontSize = ''; // Reset to default from CSS
            const baseFontSize = 8; // Corresponds to 8pt in CSS
            // Check for overflow.
            if (cell.scrollWidth > cell.clientWidth) { 
                let fontSize = baseFontSize;
                cell.style.fontSize = fontSize + 'pt';
                // Iteratively reduce font size until it fits
                while (cell.scrollWidth > cell.clientWidth && fontSize > 4) {
                    fontSize -= 0.5;
                    cell.style.fontSize = fontSize + 'pt';
                }
            }
        });
    }

    // --- IMPORT/EXPORT/RESET ---
    function downloadCSVTemplate(type) {
        let headers, exampleRow, filename;
        if (type === 'guru') {
            headers = "ID_Unik;NIP;Nama;Jabatan;Jenis_Guru";
            exampleRow = "101;198501012010011001;Dr. Budi Santoso, M.Kom.;Guru TIK;Reguler/PNS";
            filename = "template_import_guru.csv";
        } else {
            headers = "ID_Unik;Tanggal;Jam_Masuk;Jam_Pulang;Keterangan";
            exampleRow = "101;2025-10-01;07:00;15:00;";
            filename = "template_kehadiran_manual.csv";
        }
        let csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleRow}\n`;
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", filename);
        link.click();
    }
    
    function processGuruCSV(csvText) {
        const rows = csvText.split('\n').slice(1);
        const newGurus = [];
        rows.forEach(row => {
            const [id, nip, nama, jabatan, jenisGuru] = row.split(';').map(s => s.trim());
            if (id && nama && !state.guru.some(g => g.id === id)) {
                newGurus.push({ id, nip, nama, jabatan, jenisGuru: jenisGuru || 'Reguler/PNS' });
            }
        });
        if (newGurus.length > 0) {
            state.guru.push(...newGurus);
            saveState();
            renderGuruPage();
            showCustomAlert('success', 'Impor Berhasil', `${newGurus.length} data guru baru berhasil diimpor.`);
        } else {
            showCustomAlert('info', 'Tidak Ada Data Baru', 'Tidak ada data guru baru atau ID Unik duplikat ditemukan.');
        }
    }

    function processAbsensiCSV(csvText) {
        const rows = csvText.split('\n').slice(1);
        let importedCount = 0;
        const guruIds = new Set(state.guru.map(g => g.id));

        rows.forEach(row => {
            const parts = row.split(';').map(s => s.trim());
            if (parts.length < 2) return; // Skip empty rows

            const [id, tanggal, masuk, pulang, keterangan] = parts;

            // Basic validation
            if (!id || !tanggal || !guruIds.has(id) || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
                return;
            }

            const overrideKey = `${id}-${tanggal}`;
            state.kehadiranOverrides[overrideKey] = {
                keterangan: keterangan || '',
                masuk: masuk || '',
                pulang: pulang || ''
            };
            importedCount++;
        });

        if (importedCount > 0) {
            saveState();
            showCustomAlert('success', 'Impor Berhasil', `${importedCount} data kehadiran manual berhasil diimpor/diperbarui.`);
            const displayedGuruId = document.getElementById('manual-absensi-guru').value;
            const displayedMonth = document.getElementById('manual-absensi-bulan').value;
            if (displayedGuruId && displayedMonth) {
                generateManualAbsensiForm(displayedGuruId, displayedMonth);
            }
        }
    }

    function exportGuruCSV() {
        const headers = "ID_Unik;NIP;Nama;Jabatan;Jenis_Guru";
        const rows = state.guru.map(g => [g.id, g.nip, g.nama, g.jabatan, g.jenisGuru].join(';'));
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "data_guru.csv");
        link.click();
    }
    
    function backupData() {
        const dataToBackup = {
            sekolah: state.sekolah,
            pengaturanKerja: state.pengaturanKerja,
            guru: state.guru,
            absensi: state.absensi,
            kehadiranOverrides: state.kehadiranOverrides
        };
        const dataStr = JSON.stringify(dataToBackup, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.download = `backup-absensi-guru-${today}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    async function restoreData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const confirmed = await showCustomConfirm(
            'Konfirmasi Restore', 
            'Anda yakin ingin memulihkan data dari file ini? Semua data saat ini akan ditimpa.',
            'Ya, Timpa Data'
        );

        if (confirmed) {
            const reader = new FileReader();
            reader.onload = (e) => {
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
                        showCustomAlert('success', 'Restore Berhasil', 'Data telah berhasil dipulihkan. Halaman akan dimuat ulang.');
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        throw new Error('Format file backup tidak valid.');
                    }
                } catch (err) {
                    showCustomAlert('error', 'Gagal Restore', 'File backup rusak atau tidak valid.');
                    console.error("Restore failed:", err);
                }
            };
            reader.readAsText(file);
        }
        // Reset file input to allow re-selection of the same file
        event.target.value = '';
    }

    async function resetApplication() {
        const confirmed = await showCustomConfirm(
            'Reset Aplikasi',
            'PERINGATAN: Anda akan menghapus SEMUA data secara permanen. Tindakan ini tidak dapat diurungkan. Yakin ingin melanjutkan?',
            'Ya, Hapus Semua'
        );
        if (confirmed) {
            localStorage.removeItem(STORAGE_KEY);
            showCustomAlert('success', 'Reset Berhasil', 'Aplikasi telah direset ke pengaturan awal. Halaman akan dimuat ulang.');
            setTimeout(() => window.location.reload(), 2000);
        }
    }


    // --- EVENT LISTENERS ---
    function addEventListeners() {
        // Consolidated Click Handler for the entire document
        document.addEventListener('click', (event) => {
            const target = event.target;

            // 1. Handle Nav Button clicks
            const navBtn = target.closest('.nav-btn');
            if (navBtn) {
                const pageId = navBtn.id.replace('btn-', 'page-');
                showPage(pageId);
                // Close mobile nav if it's open
                if (body.classList.contains('mobile-nav-open')) {
                    body.classList.remove('mobile-nav-open');
                }
                return; // Stop further processing for this click
            }

            // 2. Handle Time Picker clicks
            const timePickerTrigger = target.closest('.time-picker-trigger, .time-input-display');
            if (timePickerTrigger) {
                const container = timePickerTrigger.closest('.time-input-container');
                if (container) {
                    const input = container.querySelector('.time-input-display');
                    if (input && !input.disabled) {
                        openTimePicker(input);
                    }
                }
                return; // Stop further processing
            }

            // 3. Handle closing mobile nav on outside click
            // This logic runs only if the click was not on the toggle button itself
            if (body.classList.contains('mobile-nav-open') && !nav.contains(target) && !target.closest('#mobile-menu-toggle')) {
                body.classList.remove('mobile-nav-open');
            }
        });

        // Mobile Navigation Specifics
        mobileMenuToggle.addEventListener('click', () => body.classList.add('mobile-nav-open'));
        mobileMenuClose.addEventListener('click', () => body.classList.remove('mobile-nav-open'));

        // Sidebar Toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            body.classList.toggle('sidebar-minimized');
        });

        // Data Guru
        document.getElementById('btn-input-guru-baru').addEventListener('click', () => openGuruModal());
        document.getElementById('btn-close-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-guru-modal').addEventListener('click', () => document.getElementById('guru-modal').classList.add('hidden'));
        document.getElementById('form-guru').addEventListener('submit', (e) => { e.preventDefault(); saveGuru(); });
        document.getElementById('btn-save-guru').addEventListener('click', saveGuru);

        document.getElementById('daftar-guru-container').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            if (editBtn) openGuruModal(editBtn.dataset.id);
            if (deleteBtn) {
                showCustomConfirm('Hapus Guru?', `Anda yakin ingin menghapus data guru ini?`).then(confirmed => {
                    if (confirmed) deleteGuru(deleteBtn.dataset.id);
                });
            }
        });

        document.getElementById('daftar-guru-container').addEventListener('change', (e) => {
            const checkbox = e.target.closest('.guru-checkbox');
            if (checkbox) {
                const id = checkbox.dataset.id;
                if (checkbox.checked) {
                    state.ui.guru.selectedIds.add(id);
                } else {
                    state.ui.guru.selectedIds.delete(id);
                }
                updateBulkActionsGuru();
                const row = checkbox.closest('tr');
                if (row) row.classList.toggle('selected', checkbox.checked);
            }
        });

        document.getElementById('search-guru-input').addEventListener('input', (e) => {
            state.ui.guru.searchQuery = e.target.value;
            document.getElementById('clear-search-guru-btn').classList.toggle('hidden', state.ui.guru.searchQuery === '');
            state.ui.guru.currentPage = 1; // Reset to first page on search
            renderGuruList();
        });
        document.getElementById('clear-search-guru-btn').addEventListener('click', () => {
            document.getElementById('search-guru-input').value = '';
            state.ui.guru.searchQuery = '';
            document.getElementById('clear-search-guru-btn').classList.add('hidden');
            renderGuruList();
        });
        
        document.getElementById('btn-delete-selected-guru').addEventListener('click', () => {
            showCustomConfirm('Hapus Guru Terpilih?', `Anda yakin ingin menghapus ${state.ui.guru.selectedIds.size} data guru terpilih?`).then(confirmed => {
                if (confirmed) {
                    state.ui.guru.selectedIds.forEach(id => deleteGuru(id));
                }
            });
        });

        document.getElementById('btn-print-selected-guru').addEventListener('click', () => {
            const selectedIds = Array.from(state.ui.guru.selectedIds);
            if (selectedIds.length > 0) {
                state.ui.cetak.selectedIds = selectedIds;
                state.ui.cetakV2.selectedIds = [];
                state.ui.cetakV3.selectedIds = [];
                state.ui.cetakV4.selectedIds = [];
                showPage('page-cetak');
            }
        });

        // Import Guru
        document.getElementById('btn-import-guru').addEventListener('click', () => {
            document.getElementById('import-guru-modal').classList.remove('hidden');
        });
        document.getElementById('btn-close-import-guru-modal').addEventListener('click', () => document.getElementById('import-guru-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-import-guru-modal').addEventListener('click', () => document.getElementById('import-guru-modal').classList.add('hidden'));
        document.getElementById('btn-download-template-guru').addEventListener('click', () => downloadCSVTemplate('guru'));
        document.getElementById('btn-confirm-import-guru').addEventListener('click', () => {
            const fileInput = document.getElementById('import-guru-file-input');
            if (fileInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => processGuruCSV(e.target.result);
                reader.readAsText(fileInput.files[0]);
                document.getElementById('import-guru-modal').classList.add('hidden');
            } else {
                showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file CSV terlebih dahulu.');
            }
        });
        document.getElementById('btn-export-guru').addEventListener('click', exportGuruCSV);

        // Set Manual Absensi
        document.getElementById('btn-tampilkan-manual-absensi').addEventListener('click', () => {
            const guruId = document.getElementById('manual-absensi-guru').value;
            const monthYear = document.getElementById('manual-absensi-bulan').value;
            if (guruId && monthYear) {
                generateManualAbsensiForm(guruId, monthYear);
            } else {
                showCustomAlert('warning', 'Data Kurang', 'Silakan pilih guru dan periode bulan terlebih dahulu.');
            }
        });

        document.getElementById('manual-absensi-form-container').addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('#btn-simpan-manual-absensi')) {
                const guruId = document.getElementById('manual-absensi-guru').value;
                document.querySelectorAll('#manual-absensi-form-container tbody tr').forEach(row => {
                    const dateStr = row.dataset.date;
                    const overrideKey = `${guruId}-${dateStr}`;
                    
                    const masuk = row.querySelector('.manual-jam:nth-of-type(1)').value;
                    const pulang = row.querySelector('.manual-jam:nth-of-type(2)').value;
                    const keterangan = row.querySelector('.manual-keterangan').value.trim();

                    if (masuk || pulang || keterangan) {
                        state.kehadiranOverrides[overrideKey] = { keterangan, masuk, pulang };
                    } else {
                        delete state.kehadiranOverrides[overrideKey];
                    }
                });
                saveState();
                showCustomAlert('success', 'Berhasil', 'Perubahan kehadiran manual telah disimpan.');
            } else if (target.closest('#btn-reset-manual-absensi')) {
                 const guruId = document.getElementById('manual-absensi-guru').value;
                 const monthYear = document.getElementById('manual-absensi-bulan').value;
                 generateManualAbsensiForm(guruId, monthYear); // Just re-render
            } else if (target.closest('.btn-reset-harian')) {
                const row = target.closest('tr');
                row.querySelector('.manual-jam:nth-of-type(1)').value = '';
                row.querySelector('.manual-jam:nth-of-type(2)').value = '';
                row.querySelector('.manual-keterangan').value = '';
                row.querySelectorAll('.manual-jam, .time-picker-trigger').forEach(el => el.disabled = false);
            }
        });

        document.getElementById('manual-absensi-form-container').addEventListener('input', (e) => {
             const target = e.target;
             if (target.classList.contains('manual-keterangan')) {
                 const row = target.closest('tr');
                 const isFilled = target.value.trim() !== '';
                 row.querySelectorAll('.manual-jam, .time-picker-trigger').forEach(el => el.disabled = isFilled);
             }
        });

        document.getElementById('btn-import-absensi-log').addEventListener('click', () => {
            document.getElementById('import-absensi-modal').classList.remove('hidden');
        });
        document.getElementById('btn-close-import-absensi-modal').addEventListener('click', () => document.getElementById('import-absensi-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-import-absensi-modal').addEventListener('click', () => document.getElementById('import-absensi-modal').classList.add('hidden'));
        document.getElementById('btn-download-template-absensi').addEventListener('click', () => downloadCSVTemplate('absensi'));
        document.getElementById('btn-confirm-import-absensi').addEventListener('click', () => {
             const fileInput = document.getElementById('import-absensi-file-input');
            if (fileInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (e) => processAbsensiCSV(e.target.result);
                reader.readAsText(fileInput.files[0]);
                document.getElementById('import-absensi-modal').classList.add('hidden');
            } else {
                 showCustomAlert('warning', 'File Belum Dipilih', 'Silakan pilih file CSV terlebih dahulu.');
            }
        });
        
        // Pengaturan
        handleImageUpload(
            document.getElementById('sekolah-logo'), 
            document.getElementById('logo-preview'), 
            (base64) => state.sekolah.logo = base64
        );
        document.getElementById('form-identitas').addEventListener('submit', e => { e.preventDefault(); saveIdentitas(); });
        document.getElementById('form-jadwal').addEventListener('submit', e => { e.preventDefault(); saveJadwal(); });

        // Cetak
        document.getElementById('btn-tampilkan-laporan').addEventListener('click', tampilkanLaporan);
        document.getElementById('btn-print-laporan').addEventListener('click', () => saveReportAsPDF('laporan-print-area', 'Laporan Kehadiran'));
        document.getElementById('btn-cancel-multi-print').addEventListener('click', () => { state.ui.cetak.selectedIds = []; renderCetakPage(); });

        document.getElementById('btn-tampilkan-laporan-v2').addEventListener('click', tampilkanLaporanV2);
        document.getElementById('btn-print-laporan-v2').addEventListener('click', () => saveReportAsPDF('laporan-print-area-v2', 'Laporan Kehadiran V2'));
        document.getElementById('btn-cancel-multi-print-v2').addEventListener('click', () => { state.ui.cetakV2.selectedIds = []; renderCetakPageV2(); });

        document.getElementById('btn-tampilkan-laporan-v3').addEventListener('click', tampilkanLaporanV3);
        document.getElementById('btn-print-laporan-v3').addEventListener('click', () => saveReportAsPDF('laporan-print-area-v3', 'Laporan Kehadiran V3'));
        document.getElementById('btn-cancel-multi-print-v3').addEventListener('click', () => { state.ui.cetakV3.selectedIds = []; renderCetakPageV3(); });

        document.getElementById('btn-tampilkan-laporan-v4').addEventListener('click', tampilkanLaporanV4);
        document.getElementById('btn-print-laporan-v4').addEventListener('click', () => saveReportAsPDF('laporan-print-area-v4', 'Laporan Kehadiran V4'));
        document.getElementById('btn-cancel-multi-print-v4').addEventListener('click', () => { state.ui.cetakV4.selectedIds = []; renderCetakPageV4(); });

        // Backup & Restore
        document.getElementById('btn-backup-data').addEventListener('click', backupData);
        document.getElementById('btn-restore-data').addEventListener('click', () => {
            document.getElementById('restore-file-input').click();
        });
        document.getElementById('restore-file-input').addEventListener('change', restoreData);
        document.getElementById('btn-reset-app').addEventListener('click', resetApplication);

        // Time Picker Modal specific listeners
        document.getElementById('time-picker-ok').addEventListener('click', () => {
            if (activeTimeInput) {
                activeTimeInput.value = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
            }
            closeTimePicker();
        });
        document.getElementById('time-picker-cancel').addEventListener('click', closeTimePicker);
        digitalHour.addEventListener('click', () => switchView(true));
        digitalMinute.addEventListener('click', () => switchView(false));
        clock.addEventListener('click', handleClockClick);
    }
    
    // --- TIME PICKER LOGIC ---
    let activeTimeInput = null;
    let currentHour = 12;
    let currentMinute = 0;
    let isHourView = true;
    const timePickerModal = document.getElementById('time-picker-modal-backdrop');
    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const digitalHour = document.getElementById('digital-display-hour');
    const digitalMinute = document.getElementById('digital-display-minute');
    const clock = document.getElementById('time-picker-clock');
    
    function createClockFace() {
        if (!clock) return;
        
        let numbersHTML = '';
        // Outer ring (1-12)
        for (let i = 1; i <= 12; i++) {
            const angle = (i - 3) * 30 * (Math.PI / 180);
            const x = 114 * Math.cos(angle) + 130 - 16;
            const y = 114 * Math.sin(angle) + 130 - 16;
            numbersHTML += `<div class="clock-number outer-ring" style="left: ${x}px; top: ${y}px;" data-value="${i}">${i}</div>`;
        }
        // Inner ring (13-24)
        for (let i = 13; i <= 24; i++) {
            const hour = (i === 24) ? 0 : i;
            const angle = (hour - 3) * 30 * (Math.PI / 180);
            const x = 80 * Math.cos(angle) + 130 - 16;
            const y = 80 * Math.sin(angle) + 130 - 16;
            const displayHour = (i === 24) ? '00' : i;
            numbersHTML += `<div class="clock-number inner-ring" style="left: ${x}px; top: ${y}px;" data-value="${hour}">${displayHour}</div>`;
        }
         // Minute markers
        for (let i = 0; i < 60; i += 5) {
            const angle = (i - 15) * 6 * (Math.PI / 180);
            const x = 114 * Math.cos(angle) + 130 - 16;
            const y = 114 * Math.sin(angle) + 130 - 16;
            numbersHTML += `<div class="clock-minute-marker" style="left: ${x}px; top: ${y}px; display: none;" data-value="${i}">${i}</div>`;
        }

        clock.innerHTML += numbersHTML;
    }

    function updateDigitalDisplay() {
        digitalHour.textContent = String(currentHour).padStart(2, '0');
        digitalMinute.textContent = String(currentMinute).padStart(2, '0');
    }
    
    function updateHand() {
        const hourAngle = (currentHour % 12) * 30 + (currentMinute / 60) * 30;
        const minuteAngle = currentMinute * 6;
        hourHand.style.transform = `rotate(${hourAngle}deg)`;
        minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
        
        const isOuterRing = currentHour > 0 && currentHour <= 12;
        hourHand.style.height = isOuterRing ? '70px' : '50px';
    }

    function switchView(toHourView) {
        isHourView = toHourView;
        digitalHour.classList.toggle('active', isHourView);
        digitalMinute.classList.toggle('active', !isHourView);
        
        clock.querySelectorAll('.clock-number').forEach(el => el.style.display = isHourView ? 'flex' : 'none');
        clock.querySelectorAll('.clock-minute-marker').forEach(el => el.style.display = isHourView ? 'none' : 'flex');
        
        hourHand.style.display = isHourView ? 'block' : 'none';
        minuteHand.style.display = isHourView ? 'none' : 'block';
    }
    
    function openTimePicker(targetInput) {
        activeTimeInput = targetInput;
        const timeValue = activeTimeInput.value;
        if (timeValue && /^\d{2}:\d{2}$/.test(timeValue)) {
            [currentHour, currentMinute] = timeValue.split(':').map(Number);
        } else {
            currentHour = 12;
            currentMinute = 0;
        }
        updateDigitalDisplay();
        updateHand();
        switchView(true);
        timePickerModal.classList.remove('hidden');
        setTimeout(() => timePickerModal.classList.add('visible'), 10);
    }
    
    function closeTimePicker() {
        timePickerModal.classList.remove('visible');
        setTimeout(() => timePickerModal.classList.add('hidden'), 200);
        activeTimeInput = null;
    }
    
    function handleClockClick(event) {
        const rect = clock.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        const positiveAngle = angle < 0 ? angle + 360 : angle;

        if (isHourView) {
            const hour = Math.round(positiveAngle / 30);
            const finalHour = hour === 0 ? 12 : hour;
            
            const distance = Math.sqrt(x*x + y*y);
            if (distance < 95) { // Inner ring
                currentHour = finalHour + 12;
                if (currentHour === 24) currentHour = 0;
                else if (currentHour === 25) currentHour = 13;
            } else { // Outer ring
                 currentHour = finalHour;
            }
            updateDigitalDisplay();
            updateHand();
            setTimeout(() => switchView(false), 250);
        } else {
            currentMinute = Math.round(positiveAngle / 6) % 60;
            updateDigitalDisplay();
            updateHand();
        }
    }

    // --- PDF SAVING ---
    async function saveReportAsPDF(elementId, defaultFileName = 'laporan') {
        const reportElement = document.getElementById(elementId);
        if (!reportElement) {
            console.error('Elemen laporan tidak ditemukan:', elementId);
            showCustomAlert('error', 'Gagal Membuat PDF', 'Elemen pratinjau laporan tidak dapat ditemukan.');
            return;
        }

        showCustomAlert('loading', 'Memproses PDF', 'Harap tunggu, PDF sedang dibuat...');

        const originalStyle = {
            width: reportElement.style.width,
            height: reportElement.style.height,
            transform: reportElement.style.transform,
            transformOrigin: reportElement.style.transformOrigin
        };
        
        try {
            // A4 dimensions in pixels at 96 DPI: 794x1123
            const a4Width = 794;
            const a4Height = 1123;
            const aspectRatio = a4Width / a4Height;

            reportElement.style.width = `${a4Width}px`;
            reportElement.style.height = `${a4Height}px`;

            const canvas = await html2canvas(reportElement, {
                scale: 2, // Increase scale for better quality
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // This can be used to apply specific styles only for the canvas rendering
                    const clonedElement = clonedDoc.getElementById(elementId);
                    clonedElement.style.display = 'block';
                }
            });

            // Restore original styles immediately after capture
            reportElement.style.width = originalStyle.width;
            reportElement.style.height = originalStyle.height;
            reportElement.style.transform = originalStyle.transform;
            reportElement.style.transformOrigin = originalStyle.transformOrigin;
            
            // Use JPEG for smaller file size with good quality
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            // Generate filename
            const guruNameElement = reportElement.querySelector('.laporan-identitas-nama strong, .laporan-identitas strong');
            const guruName = guruNameElement ? guruNameElement.textContent.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'guru';
            const periodeElement = reportElement.querySelector('.laporan-title p');
            const periode = periodeElement ? periodeElement.textContent.replace('Periode: ', '').trim().replace(/\s+/g, '_') : 'periode';
            const fileName = `${defaultFileName}_${guruName}_${periode}.pdf`;

            pdf.save(fileName);
            hideCustomAlert();

        } catch (error) {
            console.error("Gagal membuat PDF:", error);
            showCustomAlert('error', 'Gagal Membuat PDF', 'Terjadi kesalahan saat mengonversi laporan ke PDF.');
        } finally {
             // Ensure styles are always restored
            reportElement.style.width = originalStyle.width;
            reportElement.style.height = originalStyle.height;
            reportElement.style.transform = originalStyle.transform;
            reportElement.style.transformOrigin = originalStyle.transformOrigin;
        }
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        updateSharedUI();
        showPage('page-dashboard');
        addEventListeners();
        createClockFace();
    }

    init();
});
