window.addEventListener('DOMContentLoaded', () => {

    const baseUrl = '/api';

    // --- FUNGSI GLOBAL ---
    const dropdownToggles = document.querySelectorAll('.sidebar-menu .dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentLi = toggle.closest('.dropdown');
            if (parentLi) {
                parentLi.classList.toggle('active');
            }
        });
    });

    const darkModeToggle = document.getElementById('darkModeToggle');
    function setDarkMode(enabled) {
        const body = document.body;
        const darkModeIcon = document.getElementById('darkModeIcon');
        const darkModeText = document.getElementById('darkModeText');
        if (enabled) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
            if (darkModeIcon) darkModeIcon.classList.replace('fa-moon', 'fa-sun');
            if (darkModeText) darkModeText.textContent = 'Light Mode';
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
            if (darkModeIcon) darkModeIcon.classList.replace('fa-sun', 'fa-moon');
            if (darkModeText) darkModeText.textContent = 'Dark Mode';
        }
    }
    const darkModeSetting = localStorage.getItem('darkMode');
    setDarkMode(darkModeSetting === 'enabled');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            setDarkMode(!document.body.classList.contains('dark-mode'));
            darkModeToggle.blur();
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.getElementById('menuIcon');
    let overlay = null;

    function openMobileMenu() {
        if (!sidebar || !menuIcon) return;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeMobileMenu);
        }
        sidebar.classList.add('active');
        document.body.classList.add('sidebar-open');
        menuIcon.classList.replace('fa-bars', 'fa-times');
    }

    function closeMobileMenu() {
        if (!sidebar || !menuIcon) return;
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        menuIcon.classList.replace('fa-times', 'fa-bars');
    }

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    // --- HELPER FETCH API ---
    async function postData(url = '', data = {}) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        if (json.error || !response.ok) {
            const errorMessage = JSON.stringify(json.error, null, 2) || 'Terjadi kesalahan pada server.';
            throw new Error(errorMessage);
        }
        return json;
    }
    //Fungsi hapus sessi
    const clearSessionBtn = document.getElementById('clearSessionBtn');
    if (clearSessionBtn) {
        clearSessionBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Hapus Semua Sesi?',
                text: "Semua data login dan nomor telepon yang tersimpan akan dihapus dari browser ini. Anda yakin?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Ya, hapus!',
                cancelButtonText: 'Batal',
                customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
            }).then((result) => {
                if (result.isConfirmed) {
                    // Hapus data dari localStorage
                    localStorage.removeItem('userdata');
                    localStorage.removeItem('currentPhone');

                    Swal.fire({
                        title: 'Berhasil!',
                        text: 'Semua sesi telah dihapus.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                    }).then(() => {
                        // Arahkan ke halaman login
                        window.location.href = 'login.html';
                    });
                }
            });
        });
    }

    // --- HALAMAN: DASHBOARD ---
    if (document.getElementById('phoneSelect')) {
        const phoneSelect = document.getElementById('phoneSelect');
        const dashboardPhone = document.getElementById('dashboardPhone');
        const dashboardBalance = document.getElementById('dashboardBalance');
        const dashboardExpiredAt = document.getElementById('dashboardExpiredAt');
        const quotaSection = document.getElementById('quotaDetailsSection');
        const quotaContent = document.getElementById('quotaDetailsContent');

        function formatUnixTimestamp(unix) {
            if (!unix) return 'N/A';
            const date = new Date(unix * 1000);
            return date.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        }

        function formatBytes(bytes) {
            if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        }

        function calculateValidity(expiredAt) {
            if (!expiredAt) return 'N/A';
            const now = new Date();
            const expiry = new Date(expiredAt * 1000);
            if (expiry < now) return 'Kedaluwarsa';
            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} hari lagi`;
        }


        function renderQuotaFormatted(data) {
            if (!data || !data.quotas || !Array.isArray(data.quotas) || data.quotas.length === 0) {
                return '<p>Tidak ada data kuota yang tersedia.</p>';
            }
        
            return data.quotas.map(quota => {
                const benefitsHtml = (quota.benefits || []).map(benefit => `
                    <div class="quota-benefit-row">
                        <span>${benefit.name}</span>
                        <strong>Sisa: ${formatBytes(benefit.remaining)} / Total: ${formatBytes(benefit.total)}</strong>
                    </div>
                `).join('');
        
                const validityText = calculateValidity(quota.expired_at);
                const validityClass = validityText === 'Kedaluwarsa' ? 'expired' : '';
        
                const groupCodeHtml = quota.group_code
                    ? `
                        <div class="quota-group-footer">
                            <span>Grup Kode</span>
                            <strong>${quota.group_code}</strong>
                        </div>
                      `
                    : '';
        
                const quotaCodeHtml = quota.quota_code
                    ? `
                        <div class="quota-group-footer">
                            <span>Kode Kuota</span>
                            <strong>${quota.quota_code}</strong>
                        </div>
                      `
                    : '';
        
                return `
                    <div class="quota-group">
                        <div class="quota-group-header">
                            <span>${quota.name || 'Paket Tanpa Nama'}</span>
                            <span class="validity-badge ${validityClass}">${validityText}</span>
                        </div>
                        <div class="quota-group-subheader">
                            Berlaku hingga ${formatUnixTimestamp(quota.expired_at)}
                        </div>
                        <div class="quota-group-body">
                            ${benefitsHtml || '<span>Tidak ada benefit tambahan.</span>'}
                        </div>
                        ${quotaCodeHtml}
                        ${groupCodeHtml}
                    </div>
                `;
            }).join('');
        }

        function loadUserData(phone, refreshToken) {
            dashboardPhone.textContent = phone || '-';
            dashboardBalance.textContent = 'Memuat...';
            dashboardExpiredAt.textContent = 'Memuat...';
            quotaContent.innerHTML = '<p>Memuat detail kuota...</p>';
            quotaSection.style.display = 'block';

            postData(`${baseUrl}/balance-details`, { refreshToken })
                .then(data => {
                    dashboardBalance.textContent = data.balance?.remaining || 'Rp 0';
                    dashboardExpiredAt.textContent = formatUnixTimestamp(data.balance?.expired_at);
                }).catch(() => {
                    dashboardBalance.textContent = 'Gagal Memuat';
                    dashboardExpiredAt.textContent = 'Gagal Memuat';
                });

            postData(`${baseUrl}/quota-details`, { refreshToken })
                .then(data => {
                    quotaContent.innerHTML = renderQuotaFormatted(data);
                }).catch(() => {
                    quotaContent.innerHTML = '<p>Gagal memuat detail kuota.</p>';
                });
        }

        function initPhoneSelect() {
            const userdataStr = localStorage.getItem('userdata');
            if (!userdataStr) {
                phoneSelect.innerHTML = '<option disabled selected>-- Tidak ada nomor tersimpan --</option>';
                return;
            }

            const userdata = JSON.parse(userdataStr);
            const phones = Object.keys(userdata);
            if (phones.length === 0) {
                phoneSelect.innerHTML = '<option disabled selected>-- Tidak ada nomor tersimpan --</option>';
                return;
            }

            phoneSelect.innerHTML = '<option disabled>-- Pilih Nomor --</option>';
            phones.forEach(phone => {
                phoneSelect.innerHTML += `<option value="${phone}">${phone}</option>`;
            });

            const currentPhone = localStorage.getItem('currentPhone');
            const selectedPhone = (currentPhone && phones.includes(currentPhone)) ? currentPhone : phones[0];

            phoneSelect.value = selectedPhone;
            localStorage.setItem('currentPhone', selectedPhone);
            loadUserData(selectedPhone, userdata[selectedPhone].refreshToken);

            phoneSelect.addEventListener('change', () => {
                const newSelectedPhone = phoneSelect.value;
                localStorage.setItem('currentPhone', newSelectedPhone);
                loadUserData(newSelectedPhone, userdata[newSelectedPhone].refreshToken);
            });
        }

        initPhoneSelect();
    }

    // --- HALAMAN: LOGIN ---
    if (document.getElementById('reqOtpForm')) {
        const reqOtpFormSection = document.getElementById('reqOtpFormSection');
        const reqOtpForm = document.getElementById('reqOtpForm');
        const reqOtpBtn = document.getElementById('reqOtpBtn');
        const reqOtpSpinner = document.getElementById('reqOtpSpinner');
        const reqOtpBtnText = document.getElementById('reqOtpBtnText');
        const reqOtpError = document.getElementById('reqOtpError');
        const reqOtpResult = document.getElementById('reqOtpResult');
        const confirmOtpSection = document.getElementById('confirmOtpSection');
        const confirmOtpForm = document.getElementById('confirmOtpForm');
        const confirmOtpBtn = document.getElementById('confirmOtpBtn');
        const confirmOtpSpinner = document.getElementById('confirmOtpSpinner');
        const confirmOtpBtnText = document.getElementById('confirmOtpBtnText');
        const confirmOtpError = document.getElementById('confirmOtpError');
        const confirmOtpResult = document.getElementById('confirmOtpResult');
        const copyRefreshTokenBtn = document.getElementById('copyRefreshTokenBtn');

        reqOtpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            reqOtpError.textContent = '';
            reqOtpResult.textContent = '';
            reqOtpSpinner.style.display = 'inline-block';
            reqOtpBtnText.textContent = 'Meminta...';
            reqOtpBtn.disabled = true;
            const phoneNumber = reqOtpForm.phoneNumber.value.trim();
            const subsType = reqOtpForm.subsType.value;
            try {
                const data = await postData(`${baseUrl}/req-otp`, { phoneNumber, subsType });
                reqOtpResult.textContent = JSON.stringify(data, null, 2);
                Swal.fire({
                    icon: 'success',
                    title: 'OTP Terkirim!',
                    text: `Kode OTP telah dikirim ke nomor ${phoneNumber}`,
                    timer: 2500,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
                reqOtpFormSection.style.display = 'none';
                confirmOtpSection.style.display = 'block';
                confirmOtpForm.confirmPhoneNumber.value = phoneNumber;
                confirmOtpForm.confirmSubsType.value = subsType;
                confirmOtpError.textContent = '';
                confirmOtpResult.textContent = '';
                copyRefreshTokenBtn.style.display = 'none';
                confirmOtpForm.code.value = '';
                confirmOtpBtn.disabled = false;
            } catch (err) {
                reqOtpError.textContent = err.message;
            } finally {
                reqOtpSpinner.style.display = 'none';
                reqOtpBtnText.textContent = 'Kirim OTP';
                reqOtpBtn.disabled = false;
            }
        });

        confirmOtpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            confirmOtpError.textContent = '';
            confirmOtpResult.textContent = '';
            confirmOtpSpinner.style.display = 'inline-block';
            confirmOtpBtnText.textContent = 'Mengonfirmasi...';
            confirmOtpBtn.disabled = true;
            const phoneNumber = confirmOtpForm.confirmPhoneNumber.value.trim();
            const subsType = confirmOtpForm.confirmSubsType.value;
            const code = confirmOtpForm.code.value.trim();
            try {
                const data = await postData(`${baseUrl}/confirm-otp`, { phoneNumber, subsType, code });
                confirmOtpResult.textContent = JSON.stringify(data, null, 2);
                let userdata = {};
                const userdataStr = localStorage.getItem('userdata');
                if (userdataStr) {
                    try { userdata = JSON.parse(userdataStr); } catch { userdata = {}; }
                }
                userdata[phoneNumber] = {
                    phone: phoneNumber,
                    refreshToken: data.refreshToken || data.refresh_token || ''
                };
                localStorage.setItem('userdata', JSON.stringify(userdata));
                copyRefreshTokenBtn.style.display = 'inline-flex';
                Swal.fire({
                    icon: 'success',
                    title: 'Login Berhasil!',
                    text: 'Anda akan diarahkan ke Dashboard.',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } catch (err) {
                confirmOtpError.textContent = err.message;
            } finally {
                confirmOtpSpinner.style.display = 'none';
                confirmOtpBtnText.textContent = 'Konfirmasi & Login';
                confirmOtpBtn.disabled = false;
            }
        });

        copyRefreshTokenBtn.addEventListener('click', () => {
            const userdataStr = localStorage.getItem('userdata');
            if (!userdataStr) return;
            try {
                const userdata = JSON.parse(userdataStr);
                const phoneNumber = confirmOtpForm.confirmPhoneNumber.value.trim();
                const token = userdata[phoneNumber]?.refreshToken || '';
                if (!token) return;
                navigator.clipboard.writeText(token).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Disalin!',
                        text: 'Refresh token berhasil disalin.',
                        timer: 1500,
                        showConfirmButton: false,
                        customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                    });
                });
            } catch (err) {
                console.error("Gagal menyalin token:", err);
            }
        });
    }

    // --- HALAMAN: DETAIL PAKET ---
    if (document.getElementById('packageDetailsForm')) {
        const packageDetailsForm = document.getElementById('packageDetailsForm');
        const packageDetailsBtn = document.getElementById('packageDetailsBtn');
        const packageDetailsSpinner = document.getElementById('packageDetailsSpinner');
        const packageDetailsBtnText = document.getElementById('packageDetailsBtnText');
        const packageDetailsError = document.getElementById('packageDetailsError');
        const resultSection = document.getElementById('resultSection');
        const packageDetailsJsonView = document.getElementById('packageDetailsJsonView');
        const packageDetailsFormattedView = document.getElementById('packageDetailsFormattedView');
        const togglePackageViewBtn = document.getElementById('togglePackageViewBtn');
        let currentPackageData = null;
        let showingFormatted = true;

        const userdataStr = localStorage.getItem('userdata');
        let currentPhone = localStorage.getItem('currentPhone');
        let currentToken = null;
        if (userdataStr) {
            try {
                const userdata = JSON.parse(userdataStr);
                if (!currentPhone) {
                    const phones = Object.keys(userdata);
                    if (phones.length > 0) currentPhone = phones[0];
                }
                if (currentPhone && userdata[currentPhone]) {
                    currentToken = userdata[currentPhone].refreshToken || null;
                }
            } catch (e) {
                console.error("Gagal mem-parsing userdata dari localStorage", e);
            }
        }
        document.getElementById('currentPhoneNumber').textContent = currentPhone || 'Tidak ada (silakan login)';
        document.getElementById('packageDetailsRefreshToken').value = currentToken || '';

        function renderPackageFormatted(data) {
            if (!data || !data.package_family || !data.package_detail_variant) return '<p>Data paket tidak lengkap.</p>';
            const pf = data.package_family;
            const pdv = data.package_detail_variant;
            const po = data.package_option || {};
            const flashsaleCountdown = pf.flashsale_countdown > 0 ? `${pf.flashsale_countdown} detik` : 'Tidak ada';
            const benefitsHtml = (po.benefits || []).map(benefit => `
                <div class="detail-benefit-item">
                    <strong>${benefit.name}</strong> (${benefit.data_type || 'N/A'})
                </div>`).join('') || 'Tidak ada benefit.';

            const tncHtml = po.tnc ? `<div class="detail-tnc"><strong>Syarat & Ketentuan:</strong>${po.tnc}</div>` : '';
            return `
                <div class="detail-group">
                    <div class="detail-item"><span>Nama Paket</span><strong>${pf.name || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Kode Paket</span><strong>${pf.package_family_code || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Tipe Paket</span><strong>${pf.package_family_type || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Hitung Mundur Flashsale</span><strong>${flashsaleCountdown}</strong></div>
                </div>
                <div class="detail-group">
                    <div class="detail-item"><span>Nama Varian</span><strong>${pdv.name || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Kode Varian</span><strong>${pdv.package_variant_code || 'N/A'}</strong></div>
                </div>
                 <div class="detail-group">
                    <div class="detail-item"><span>Nama Opsi</span><strong>${po.name || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Kode Opsi</span><strong>${po.package_option_code || 'N/A'}</strong></div>
                    <div class="detail-item"><span>Harga</span><strong>${po.price != null ? `Rp ${po.price.toLocaleString('id-ID')}` : 'N/A'}</strong></div>
                    <div class="detail-item"><span>Tipe Pembelian</span><strong>${po.occuring_type || 'N/A'}</strong></div>
                </div>
                <div class="detail-group">
                    <strong>Benefit:</strong>
                    ${benefitsHtml}
                </div>
                ${tncHtml}`;
        }

        packageDetailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            packageDetailsError.textContent = '';
            resultSection.style.display = 'none';
            packageDetailsSpinner.style.display = 'inline-block';
            packageDetailsBtnText.textContent = 'Mencari...';
            packageDetailsBtn.disabled = true;
            const refreshToken = packageDetailsForm.refreshToken.value.trim();
            const packageCode = packageDetailsForm.packageCode.value.trim();
            if (!refreshToken) {
                packageDetailsError.textContent = 'Refresh token tidak ditemukan. Silakan login terlebih dahulu.';
                packageDetailsSpinner.style.display = 'none';
                packageDetailsBtnText.textContent = 'Dapatkan Detail';
                packageDetailsBtn.disabled = false;
                return;
            }
            try {
                const data = await postData(`${baseUrl}/package-details`, { refreshToken, packageCode });
                currentPackageData = data;
                resultSection.style.display = 'block';
                packageDetailsFormattedView.innerHTML = renderPackageFormatted(data);
                packageDetailsFormattedView.style.display = 'block';
                packageDetailsJsonView.style.display = 'none';
                togglePackageViewBtn.textContent = 'Lihat JSON';
                showingFormatted = true;
                Swal.fire({
                    icon: 'success',
                    title: 'Detail paket ditemukan!',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } catch (err) {
                packageDetailsError.textContent = err.message;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: err.message,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } finally {
                packageDetailsSpinner.style.display = 'none';
                packageDetailsBtnText.textContent = 'Dapatkan Detail';
                packageDetailsBtn.disabled = false;
            }
        });

        togglePackageViewBtn.addEventListener('click', () => {
            if (!currentPackageData) return;
            showingFormatted = !showingFormatted;
            if (showingFormatted) {
                packageDetailsFormattedView.style.display = 'block';
                packageDetailsJsonView.style.display = 'none';
                togglePackageViewBtn.textContent = 'Lihat JSON';
            } else {
                packageDetailsJsonView.textContent = JSON.stringify(currentPackageData, null, 2);
                packageDetailsFormattedView.style.display = 'none';
                packageDetailsJsonView.style.display = 'block';
                togglePackageViewBtn.textContent = 'Lihat Tampilan Rapih';
            }
        });
    }

    // --- HALAMAN: DAFTAR PAKET ---
    if (document.getElementById('packageListForm')) {
        const packageListForm = document.getElementById('packageListForm');
        const packageListBtn = document.getElementById('packageListBtn');
        const packageListSpinner = document.getElementById('packageListSpinner');
        const packageListBtnText = document.getElementById('packageListBtnText');
        const packageListError = document.getElementById('packageListError');
        const resultSection = document.getElementById('resultSection');
        const packageListJsonView = document.getElementById('packageListJsonView');
        const packageListFormattedView = document.getElementById('packageListFormattedView');
        const togglePackageListViewBtn = document.getElementById('togglePackageListViewBtn');
        let currentPackageListData = null;
        let showingFormatted = true;
    
        const userdataStr = localStorage.getItem('userdata');
        let currentPhone = localStorage.getItem('currentPhone');
        let currentToken = null;
        if (userdataStr) {
            try {
                const userdata = JSON.parse(userdataStr);
                if (!currentPhone) {
                    const phones = Object.keys(userdata);
                    if (phones.length > 0) currentPhone = phones[0];
                }
                if (currentPhone && userdata[currentPhone]) {
                    currentToken = userdata[currentPhone].refreshToken || null;
                }
            } catch (e) { console.error("Gagal mem-parsing userdata.", e); }
        }
        document.getElementById('currentPhoneNumber').textContent = currentPhone || 'Tidak ada (silakan login)';
        packageListForm.dataset.refreshToken = currentToken || '';
    
        function renderPackageListFormatted(data) {
            if (!data || !data.package_variants || !Array.isArray(data.package_variants)) {
                return '<p>Data varian paket tidak ditemukan.</p>';
            }
        
            const family = data.package_family || {};
        
            const variantsHtml = data.package_variants.map(variant => {
                const optionsHtml = (variant.package_options || []).map((option, idx) => { // ← tambah idx
                    const benefitsHtml = (option.benefits && option.benefits.length > 0)
                        ? `<ul>${option.benefits.map(benefit => `<li>${benefit.name}</li>`).join('')}</ul>`
                        : '<span>Tidak ada benefit tambahan.</span>';
        
                    const price = option.price != null ? `Rp ${option.price.toLocaleString('id-ID')}` : 'N/A';
                    const validity = option.validity || 'N/A';
        
                    return `
                        <div class="package-list-item">
                            <div class="package-list-header">
                                <strong class="package-name">
                                    ${idx + 1}. ${option.name || 'N/A'}
                                </strong>
                                <strong class="package-price">${price}</strong>
                            </div>
                            <div class="package-list-body">
                                <div class="package-detail-row">
                                    <span>Kode</span>
                                    <strong class="package-code">${option.package_option_code || 'N/A'}</strong>
                                </div>
                                <div class="package-detail-row">
                                    <span>Masa Aktif</span>
                                    <strong>${validity}</strong>
                                </div>
                                <div class="package-detail-row benefits">
                                    <span>Benefit</span>
                                    <div class="benefits-content">${benefitsHtml}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
        
                // kalau nama kosong maka H4 hilang
                const variantTitleHtml =
                    (variant.name && variant.name.trim() !== '' && variant.name.trim() !== 'N/A')
                        ? `<h4>${variant.name}</h4>`
                        : '';
        
                return `
                    <div class="package-variant">
                        ${variantTitleHtml}
                        <div class="options-container">${optionsHtml}</div>
                    </div>
                `;
            }).join('');
        
            return `
                <div class="package-family-header">
                    <h3>${family.name || 'N/A'}</h3>
                    <span>Tipe: ${family.package_family_type || 'N/A'} / Kode: ${family.package_family_code || 'N/A'}</span>
                </div>
                ${variantsHtml || '<p>Tidak ada varian paket yang tersedia.</p>'}
            `;
        }

    
        // ============ EVENT SUBMIT ============
        packageListForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            packageListError.textContent = '';
            resultSection.style.display = 'none';
            packageListSpinner.style.display = 'inline-block';
            packageListBtnText.textContent = 'Mencari...';
            packageListBtn.disabled = true;
    
            const familyCode = packageListForm.familyCode.value.trim();
            const isEnterprise = packageListForm.isEnterprise.value === 'YA'; // ubah jadi boolean true/false
            const migrationType = packageListForm.migrationType.value;
            const refreshToken = packageListForm.dataset.refreshToken;
    
            if (!refreshToken) {
                packageListError.textContent = 'Refresh token tidak ditemukan. Silakan login terlebih dahulu.';
                packageListSpinner.style.display = 'none';
                packageListBtnText.textContent = 'Dapatkan Daftar Paket';
                packageListBtn.disabled = false;
                return;
            }
    
            try {
                const bodyData = { refreshToken, familyCode, isEnterprise, migrationType };
                const data = await postData(`${baseUrl}/package-list`, bodyData);
                currentPackageListData = data;
                resultSection.style.display = 'block';
                packageListFormattedView.innerHTML = renderPackageListFormatted(data);
                packageListFormattedView.style.display = 'block';
                packageListJsonView.style.display = 'none';
                togglePackageListViewBtn.textContent = 'Lihat JSON';
                showingFormatted = true;
                Swal.fire({
                    icon: 'success',
                    title: 'Daftar paket ditemukan!',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } catch (err) {
                packageListError.textContent = err.message;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: err.message,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } finally {
                packageListSpinner.style.display = 'none';
                packageListBtnText.textContent = 'Dapatkan Daftar Paket';
                packageListBtn.disabled = false;
            }
        });
    
        togglePackageListViewBtn.addEventListener('click', () => {
            if (!currentPackageListData) return;
            showingFormatted = !showingFormatted;
            if (showingFormatted) {
                packageListFormattedView.style.display = 'block';
                packageListJsonView.style.display = 'none';
                togglePackageListViewBtn.textContent = 'Lihat JSON';
            } else {
                packageListJsonView.textContent = JSON.stringify(currentPackageListData, null, 2);
                packageListFormattedView.style.display = 'none';
                packageListJsonView.style.display = 'block';
                togglePackageListViewBtn.textContent = 'Lihat Tampilan Rapih';
            }
        });
    }

    // --- HALAMAN: DOR (V1) ---
    function renderQr(qrData) {
        const wrapper = document.getElementById('dorQrWrapper');
        const qrDiv = document.getElementById('dorQrContainer');

        wrapper.style.display = 'flex';
        qrDiv.innerHTML = '';

        new QRCode(qrDiv, {
            text: qrData,
            width: 300,
            height: 300
        });
    }

    if (document.getElementById('dorForm')) {
        const resultSection = document.getElementById('resultSection');
        const dorFormattedResult = document.getElementById('dorFormattedResult');
        const toggleDorViewBtn = document.getElementById('toggleDorViewBtn');
        const downloadQrBtn = document.getElementById('downloadQrBtn');
        let currentDorData = null;
        let showingFormatted = true;


        function renderDorFormatted(data) {
            const detail = data.details && data.details[0] ? data.details[0] : {};
            const namaPaket = detail.name || 'N/A';
            const status = detail.status || 'N/A';
            const jumlahBayar = data.total_amount != null ? `Rp ${data.total_amount.toLocaleString('id-ID')}` : 'N/A';
            const metodeBayar = data.payment_method || 'N/A';
            const kodeTransaksi = data.transaction_code || 'N/A';
            const deeplink = data.deeplink;


            let deeplinkHtml = '';
            if (deeplink) {
                deeplinkHtml = `
            <div class="detail-item">
                <span>Link Bayar</span>
                <div class="deeplink-container">
                    <a href="${deeplink}" target="_blank" rel="noopener noreferrer">${deeplink}</a>
                    <button id="copyDeeplinkBtn" class="btn btn-secondary" data-link="${deeplink}">
                        <i class="fas fa-copy"></i> Salin
                    </button>
                </div>
            </div>
        `;
            }

            return `
        <div class="detail-group">
            <div class="detail-item"><span>Nama Paket</span><strong>${namaPaket}</strong></div>
            <div class="detail-item"><span>Jumlah Bayar</span><strong>${jumlahBayar}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${status}</strong></div>
            <div class="detail-item"><span>Metode Bayar</span><strong>${metodeBayar}</strong></div>
            <div class="detail-item"><span>Kode Transaksi</span><strong>${kodeTransaksi}</strong></div>
            ${deeplinkHtml}
        </div>
    `;
        }


        dorFormattedResult.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('#copyDeeplinkBtn');
            if (copyBtn) {
                const linkToCopy = copyBtn.dataset.link;
                if (linkToCopy) {
                    navigator.clipboard.writeText(linkToCopy).then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Disalin!',
                            text: 'Link pembayaran berhasil disalin.',
                            timer: 1500,
                            showConfirmButton: false,
                            customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                        });
                    }).catch(err => {
                        console.error('Gagal menyalin link:', err);
                        Swal.fire({
                            icon: 'error',
                            title: 'Gagal',
                            text: 'Tidak dapat menyalin link.',
                            customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                        });
                    });
                }
            }
        });

        toggleDorViewBtn.addEventListener('click', () => {
            if (!currentDorData) return;
            showingFormatted = !showingFormatted;
            if (showingFormatted) {
                dorFormattedResult.style.display = 'block';
                dorResult.style.display = 'none';
                toggleDorViewBtn.textContent = 'Lihat JSON';
            } else {
                dorResult.textContent = JSON.stringify(currentDorData, null, 2);
                dorFormattedResult.style.display = 'none';
                dorResult.style.display = 'block';
                toggleDorViewBtn.textContent = 'Lihat Tampilan Rapih';
            }
        });
       // Fungsi Download Qris
        if (downloadQrBtn) {
            downloadQrBtn.addEventListener('click', () => {
                const qrCanvas = document.querySelector('#dorQrContainer canvas');
                if (qrCanvas && currentDorData && currentDorData.transaction_code) {
                    const link = document.createElement('a');
                    link.href = qrCanvas.toDataURL('image/png');
        
                    const transactionCode = currentDorData.transaction_code;
                    link.download = `${transactionCode}-qris-payment-kmkz.png`;
        
                    link.click();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: 'Gambar QR code tidak ditemukan untuk diunduh.',
                        customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                    });
                }
            });
        }

        const dorForm = document.getElementById('dorForm');
        const dorResult = document.getElementById('dorResult');
        const dorError = document.getElementById('dorError');
        const dorBtn = document.getElementById('dorBtn');
        const dorSpinner = document.getElementById('dorSpinner');
        const dorBtnText = document.getElementById('dorBtnText');
        const userdataStr = localStorage.getItem('userdata');
        let currentPhone = localStorage.getItem('currentPhone');
        let currentToken = null;
        if (userdataStr) {
            try {
                const userdata = JSON.parse(userdataStr);
                if (!currentPhone) {
                    const phones = Object.keys(userdata);
                    if (phones.length > 0) currentPhone = phones[0];
                }
                if (currentPhone && userdata[currentPhone]) {
                    currentToken = userdata[currentPhone].refreshToken || null;
                }
            } catch (e) {
                console.error("Gagal mem-parsing userdata.", e);
            }
        }
        document.getElementById('currentPhoneNumber').textContent = currentPhone || 'Tidak ada (silakan login)';
        document.getElementById('dorRefreshToken').value = currentToken || '';

        dorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            dorError.textContent = '';
            dorResult.style.display = 'none';
            dorSpinner.style.display = 'inline-block';
            dorBtn.disabled = true;
            dorBtnText.textContent = 'Mengirim...';
            const payload = {
                refreshToken: dorForm.refreshToken.value.trim(),
                packageCode: dorForm.packageCode.value.trim(),
                paymentMethod: dorForm.paymentMethod.value,
                overwritePrice: Number(dorForm.overwritePrice.value)
            };
            try {
                const data = await postData(`${baseUrl}/dor`, payload);
                if (payload.paymentMethod === 'QRIS') {
                    const transactionCode = data.transaction_code;
                    const pendingPayload = { refreshToken: payload.refreshToken, transactionCode: transactionCode };
                    const pendingDetail = await postData(`${baseUrl}/pending-detail`, pendingPayload);
                    data.qr_code = pendingDetail.qr_code;
                    renderQr(pendingDetail.qr_code);
                }


                currentDorData = data;
                resultSection.style.display = 'block';


                dorFormattedResult.innerHTML = renderDorFormatted(data);
                dorFormattedResult.style.display = 'block';


                dorResult.style.display = 'none';
                toggleDorViewBtn.textContent = 'Lihat JSON';
                showingFormatted = true;


                Swal.fire({
                    icon: 'success',
                    title: 'DOR Berhasil!',
                    text: 'Permintaan DOR berhasil dikirim.',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } catch (err) {
                const errorMessage = err.message || 'Gagal mengirim DOR';
                dorError.textContent = errorMessage;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: errorMessage,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } finally {
                dorSpinner.style.display = 'none';
                dorBtn.disabled = false;
                dorBtnText.textContent = 'DAR DER DOR JEDOR!';
            }
        });
    }

    // --- HALAMAN: DOR V2 ---
    if (document.getElementById('dorv2Form')) {
        const dorv2Form = document.getElementById('dorv2Form');
        const dorv2Result = document.getElementById('dorv2Result');
        const dorv2Error = document.getElementById('dorv2Error');
        const dorv2Btn = document.getElementById('dorv2Btn');
        const dorv2Spinner = document.getElementById('dorv2Spinner');
        const dorv2BtnText = document.getElementById('dorv2BtnText');
        const userdataStr = localStorage.getItem('userdata');
        let currentPhone = localStorage.getItem('currentPhone');
        let currentToken = null;
        if (userdataStr) {
            try {
                const userdata = JSON.parse(userdataStr);
                if (!currentPhone) {
                    const phones = Object.keys(userdata);
                    if (phones.length > 0) currentPhone = phones[0];
                }
                if (currentPhone && userdata[currentPhone]) {
                    currentToken = userdata[currentPhone].refreshToken || null;
                }
            } catch (e) {
                console.error("Gagal mem-parsing userdata.", e);
            }
        }
        document.getElementById('currentPhoneNumber').textContent = currentPhone || 'Tidak ada (silakan login)';
        dorv2Form.dataset.phoneNumber = currentPhone || '';
        dorv2Form.dataset.refreshToken = currentToken || '';

        dorv2Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            dorv2Error.textContent = '';
            dorv2Result.style.display = 'none';
            dorv2Spinner.style.display = 'inline-block';
            dorv2Btn.disabled = true;
            dorv2BtnText.textContent = 'Mengirim...';
            const refreshToken = dorv2Form.dataset.refreshToken;
            const phoneNumber = dorv2Form.dataset.phoneNumber;
            if (!refreshToken || !phoneNumber) {
                dorv2Error.textContent = 'Data pengguna tidak ditemukan. Silakan login terlebih dahulu.';
                dorv2Spinner.style.display = 'none';
                dorv2Btn.disabled = false;
                dorv2BtnText.textContent = 'DAR DER DOR JEDOR v2!';
                return;
            }
            const overwritePriceValue = dorv2Form.overwritePrice.value;
            const payload = {
                phoneNumber,
                refreshToken,
                packageCode: dorv2Form.packageCode.value.trim(),
                overwritePrice: overwritePriceValue ? Number(overwritePriceValue) : undefined,
                dorKey: dorv2Form.dorKey.value.trim(),
            };
            try {
                const data = await postData(`${baseUrl}/dorv2`, payload);
                dorv2Result.textContent = JSON.stringify(data, null, 2);
                dorv2Result.style.display = 'block';
                Swal.fire({
                    icon: 'success',
                    title: 'DORv2 Berhasil!',
                    text: 'Permintaan DORv2 berhasil dikirim.',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } catch (err) {
                const errorMessage = err.message || 'Gagal mengirim DORv2';
                dorv2Error.textContent = errorMessage;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: errorMessage,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            } finally {
                dorv2Spinner.style.display = 'none';
                dorv2Btn.disabled = false;
                dorv2BtnText.textContent = 'DAR DER DOR JEDOR v2!';
            }
        });
    }

    // --- HALAMAN: DOR V3 ---
if (document.getElementById('dorv3Form')) {
    // --- 1. Ambil semua elemen DOM yang dibutuhkan ---
    const dorv3Form = document.getElementById('dorv3Form');
    const dorv3Error = document.getElementById('dorv3Error');
    const dorv3Btn = document.getElementById('dorv3Btn');
    const dorv3Spinner = document.getElementById('dorv3Spinner');
    const dorv3BtnText = document.getElementById('dorv3BtnText');

    // Elemen untuk hasil
    const resultSection = document.getElementById('dorv3ResultSection');
    const dorv3FormattedResult = document.getElementById('dorv3FormattedResult');
    const dorv3Result = document.getElementById('dorv3Result');
    const toggleDorv3ViewBtn = document.getElementById('toggleDorv3ViewBtn');

    // Elemen untuk QRIS
    const dorv3QrWrapper = document.getElementById('dorv3QrWrapper');
    const dorv3QrContainer = document.getElementById('dorv3QrContainer');
    const downloadDorv3QrBtn = document.getElementById('downloadDorv3QrBtn');

    // State management
    let currentDorv3Data = null;
    let showingFormattedV3 = true;

    // --- 2. Fungsi-fungsi Helper ---
    function renderDorv3Qr(qrData) {
        dorv3QrWrapper.style.display = 'flex';
        dorv3QrContainer.innerHTML = '';
        new QRCode(dorv3QrContainer, {
            text: qrData,
            width: 300,
            height: 300
        });
    }

    function renderDorv3Formatted(data) {
        const detail = data.details && data.details[0] ? data.details[0] : {};
        const namaPaket = detail.name || data.package_name || 'N/A';
        const status = detail.status || data.status || 'N/A';
        const jumlahBayar = data.total_amount != null ? `Rp ${data.total_amount.toLocaleString('id-ID')}` : 'N/A';
        const metodeBayar = data.payment_method || 'N/A';
        const kodeTransaksi = data.transaction_code || 'N/A';
        const deeplink = data.deeplink;

        let deeplinkHtml = '';
        if (deeplink) {
            deeplinkHtml = `
                <div class="detail-item">
                    <span>Link Bayar</span>
                    <div class="deeplink-container">
                        <a href="${deeplink}" target="_blank" rel="noopener noreferrer">${deeplink}</a>
                        <button id="copyDorv3DeeplinkBtn" class="btn btn-secondary" data-link="${deeplink}">
                            <i class="fas fa-copy"></i> Salin
                        </button>
                    </div>
                </div>`;
        }

        return `
            <div class="detail-group">
                <div class="detail-item"><span>Nama Paket</span><strong>${namaPaket}</strong></div>
                <div class="detail-item"><span>Jumlah Bayar</span><strong>${jumlahBayar}</strong></div>
                <div class="detail-item"><span>Status</span><strong>${status}</strong></div>
                <div class="detail-item"><span>Metode Bayar</span><strong>${metodeBayar}</strong></div>
                <div class="detail-item"><span>Kode Transaksi</span><strong>${kodeTransaksi}</strong></div>
                ${deeplinkHtml}
            </div>`;
    }

    // --- 3. Event Listeners untuk interaktivitas hasil ---
    dorv3FormattedResult.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('#copyDorv3DeeplinkBtn');
        if (copyBtn) {
            navigator.clipboard.writeText(copyBtn.dataset.link).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Disalin!',
                    text: 'Link pembayaran berhasil disalin.',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            }).catch(err => {
                console.error('Gagal menyalin link:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Tidak dapat menyalin link.',
                    customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
                });
            });
        }
    });

    toggleDorv3ViewBtn.addEventListener('click', () => {
        if (!currentDorv3Data) return;
        showingFormattedV3 = !showingFormattedV3;
        if (showingFormattedV3) {
            dorv3FormattedResult.style.display = 'block';
            dorv3Result.style.display = 'none';
            toggleDorv3ViewBtn.textContent = 'Lihat JSON';
        } else {
            dorv3Result.textContent = JSON.stringify(currentDorv3Data, null, 2);
            dorv3FormattedResult.style.display = 'none';
            dorv3Result.style.display = 'block';
            toggleDorv3ViewBtn.textContent = 'Lihat Tampilan Rapih';
        }
    });

    downloadDorv3QrBtn.addEventListener('click', () => {
        const qrCanvas = document.querySelector('#dorv3QrContainer canvas');
        if (qrCanvas && currentDorv3Data && currentDorv3Data.transaction_code) {
            const link = document.createElement('a');
            link.href = qrCanvas.toDataURL('image/png');
            link.download = `${currentDorv3Data.transaction_code}-qris-payment-kmkz-v3.png`;
            link.click();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gambar QR code tidak ditemukan untuk diunduh.',
                customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
            });
        }
    });

    // --- 4. Logika Utama Pengiriman Form v3 ---
    const userdataStr = localStorage.getItem('userdata');
    let currentPhone = localStorage.getItem('currentPhone');
    let currentToken = null;
    if (userdataStr) {
        try {
            const userdata = JSON.parse(userdataStr);
            if (!currentPhone) {
                const phones = Object.keys(userdata);
                if (phones.length > 0) currentPhone = phones[0];
            }
            if (currentPhone && userdata[currentPhone]) {
                currentToken = userdata[currentPhone].refreshToken || null;
            }
        } catch (e) { console.error("Gagal mem-parsing userdata.", e); }
    }
    document.getElementById('currentPhoneNumber').textContent = currentPhone || 'Tidak ada (silakan login)';

    // Submit event untuk form v3
    dorv3Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        dorv3Error.textContent = '';
        resultSection.style.display = 'none';
        dorv3QrWrapper.style.display = 'none';
        dorv3Spinner.style.display = 'inline-block';
        dorv3Btn.disabled = true;
        dorv3BtnText.textContent = 'Mengirim...';

        if (!currentToken || !currentPhone) {
            dorv3Error.textContent = 'Data pengguna tidak ditemukan. Silakan login terlebih dahulu.';
            dorv3Spinner.style.display = 'none';
            dorv3Btn.disabled = false;
            dorv3BtnText.textContent = 'DAR DER DOR JEDOR v3!';
            return;
        }

        const overwritePriceValue = dorv3Form.overwritePrice.value;

        // 🔧 Tambahkan PAYMENT FOR di payload
        const payload = {
            phoneNumber: currentPhone,
            refreshToken: currentToken,
            needBypass: dorv3Form.bypass.value === "true",
            paymentMethod: dorv3Form.paymentMethod.value,
            paymentFor: dorv3Form.paymentFor.value.trim() || "BUY_ADD_ON",
            packageCode: dorv3Form.packageCode.value.trim(),
            overwritePrice: overwritePriceValue ? Number(overwritePriceValue) : undefined,
            dorKey: dorv3Form.dorKey.value.trim(),
        };

        try {
            const data = await postData(`${baseUrl}/dorv5`, payload);

            if (payload.paymentMethod === 'QRIS' && data.transaction_code) {
                const pendingPayload = { refreshToken: payload.refreshToken, transactionCode: data.transaction_code };
                const pendingDetail = await postData(`${baseUrl}/pending-detail`, pendingPayload);
                data.qr_code = pendingDetail.qr_code;
                renderDorv3Qr(pendingDetail.qr_code);
            }

            currentDorv3Data = data;
            resultSection.style.display = 'block';
            dorv3FormattedResult.innerHTML = renderDorv3Formatted(data);
            dorv3FormattedResult.style.display = 'block';
            dorv3Result.style.display = 'none';
            toggleDorv3ViewBtn.textContent = 'Lihat JSON';
            showingFormattedV3 = true;

            Swal.fire({
                icon: 'success',
                title: 'DORv3 Berhasil!',
                text: 'Permintaan DORv3 berhasil dikirim.',
                timer: 2000,
                showConfirmButton: false,
                customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
            });
        } catch (err) {
            const errorMessage = err.message || 'Gagal mengirim DORv3';
            dorv3Error.textContent = errorMessage;
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: errorMessage,
                customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal2-dark' : '' }
            });
        } finally {
            dorv3Spinner.style.display = 'none';
            dorv3Btn.disabled = false;
            dorv3BtnText.textContent = 'DAR DER DOR JEDOR v3!';
        }
    });
}


    if (window.SakanaWidget) {
        // const widget = new SakanaWidget();
        // new SakanaWidget({ controls: false }).mount('#sakana-widget');
        // const karakterKustom = SakanaWidget.getCharacter('chisato');

        const github = SakanaWidget.getCharacter('chisato');
        github.image = `https://i.ibb.co.com/M0N8h0C/takina.webp`;
        SakanaWidget.registerCharacter('takina', github);
        new SakanaWidget({
            character: 'takina',
            size: 250,
            controls: false
        }).mount('#sakana-widget')
            .setState({
                i: 0.002,
                d: 0.989,
                s: 0.35
            });
    }

});
