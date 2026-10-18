/* ============================================================
   الجداول الدراسية — الفصل الدراسي الحالي
   ============================================================
   كيفية إضافة جدول جديد:
     1) ضع صورة الجدول داخل المجلد:  images/timetables/
     2) أضف عنصراً جديداً في مصفوفة TIMETABLES أدناه بنفس الشكل
   ============================================================ */

(function () {
    'use strict';

    var TIMETABLES = [
        {
            id: 'mining',
            department: 'التعدين',
            term: 'فصل الخريف',
            year: '2026 – 2027',
            image: 'images/timetables/mining.png',
            thumb: 'images/timetables/mining-thumb.webp',
            isNew: true
        },
        {
            id: 'civil-general',
            department: 'العام والهندسة المدنية',
            term: 'فصل الخريف',
            year: '2026 – 2027',
            image: 'images/timetables/civil-general.png',
            thumb: 'images/timetables/civil-general-thumb.webp',
            isNew: true
        }
    ];

    /* صور إضافية تُعرض بالعارض فقط (بدون بطاقة في قسم الجداول) */
    var EXTRA_IMAGES = [
        {
            id: 'banner',
            title: 'كلية الهندسة – جامعة الجفرة',
            meta: 'ليبيا تبني المستقبل',
            image: 'images/banner.png',
            download: 'كلية الهندسة - ليبيا تبني المستقبل.png',
            alt: 'بانر كلية الهندسة – جامعة الجفرة: ليبيا تبني المستقبل'
        }
    ];

    var ALL_ITEMS = TIMETABLES.concat(EXTRA_IMAGES);

    /* ---------- أدوات مساعدة ---------- */
    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function downloadName(item) {
        return 'جدول ' + item.department + ' - ' + item.term + ' ' + item.year + '.png';
    }

    function itemTitle(item) {
        return item.title || ('جدول ' + item.department);
    }

    function itemMeta(item) {
        return item.meta || ('الجدول الدراسي · ' + item.term + ' ' + item.year);
    }

    function itemDownload(item) {
        return item.download || downloadName(item);
    }

    function itemAlt(item) {
        return item.alt || ('الجدول الدراسي ' + item.department + ' - ' + item.term + ' ' + item.year);
    }

    function findItem(id) {
        for (var i = 0; i < ALL_ITEMS.length; i++) {
            if (ALL_ITEMS[i].id === id) return ALL_ITEMS[i];
        }
        return null;
    }

    /* ---------- حالة العارض ---------- */
    var tv = {
        open: false,
        zoom: 1,
        fit: 1,
        naturalW: 0,
        naturalH: 0,
        lastFocus: null,
        openedAt: 0
    };

    var MIN_ZOOM = 0.4;
    var MAX_ZOOM = 6;

    /* ---------- بناء البطاقات ---------- */
    function renderTimetables() {
        var section = document.getElementById('timetablesSection');
        var grid = document.getElementById('timetablesGrid');
        if (!section || !grid || !TIMETABLES.length) return;

        grid.innerHTML = TIMETABLES.map(function (item) {
            var alt = 'الجدول الدراسي ' + item.department + ' - ' + item.term + ' ' + item.year;
            return '' +
                '<article class="timetable-card">' +
                    '<div class="timetable-thumb" data-tt="' + esc(item.id) + '" role="button" tabindex="0" aria-label="عرض جدول ' + esc(item.department) + '">' +
                        '<img src="' + esc(item.thumb) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
                        (item.isNew ? '<span class="timetable-badge">جديد</span>' : '') +
                        '<span class="timetable-hover"><i class="fas fa-magnifying-glass-plus"></i> عرض الجدول</span>' +
                    '</div>' +
                    '<div class="timetable-body">' +
                        '<h3><i class="fas fa-table-list"></i> ' + esc(item.department) + '</h3>' +
                        '<div class="timetable-meta">' +
                            '<span><i class="fas fa-calendar-days"></i> ' + esc(item.term + ' ' + item.year) + '</span>' +
                            '<span><i class="fas fa-graduation-cap"></i> الجدول الدراسي</span>' +
                        '</div>' +
                        '<div class="timetable-actions">' +
                            '<button type="button" class="btn btn-primary" data-tt="' + esc(item.id) + '">' +
                                '<i class="fas fa-expand"></i> عرض الجدول' +
                            '</button>' +
                            '<a class="btn btn-secondary" href="' + esc(item.image) + '" download="' + esc(downloadName(item)) + '">' +
                                '<i class="fas fa-download"></i> تحميل' +
                            '</a>' +
                        '</div>' +
                    '</div>' +
                '</article>';
        }).join('');

        section.style.display = 'block';
    }

    /* ---------- حساب مقياس "ملء الشاشة" ---------- */
    function computeFit() {
        var stage = document.getElementById('tvStage');
        if (!stage || !tv.naturalW || !tv.naturalH) {
            tv.fit = 1;
            return;
        }
        var availW = Math.max(120, stage.clientWidth - 40);
        var availH = Math.max(120, stage.clientHeight - 40);
        // لا نكبّر الصورة فوق دقتها الأصلية
        tv.fit = Math.min(availW / tv.naturalW, availH / tv.naturalH, 1);
    }

    /* ---------- تطبيق التكبير ---------- */
    function applyZoom(nextZoom, wheelEvent) {
        var stage = document.getElementById('tvStage');
        var img = document.getElementById('tvImage');
        if (!stage || !img || !tv.naturalW) return;

        var prev = tv.zoom;
        var zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));

        var rect = stage.getBoundingClientRect();
        var focusX = (wheelEvent ? wheelEvent.clientX - rect.left : stage.clientWidth / 2) + stage.scrollLeft;
        var focusY = (wheelEvent ? wheelEvent.clientY - rect.top : stage.clientHeight / 2) + stage.scrollTop;

        tv.zoom = zoom;

        img.style.width = Math.round(tv.naturalW * tv.fit * zoom) + 'px';
        img.style.height = Math.round(tv.naturalH * tv.fit * zoom) + 'px';

        var ratio = zoom / prev;
        stage.scrollLeft = focusX * ratio - (wheelEvent ? wheelEvent.clientX - rect.left : stage.clientWidth / 2);
        stage.scrollTop = focusY * ratio - (wheelEvent ? wheelEvent.clientY - rect.top : stage.clientHeight / 2);

        stage.classList.toggle('is-pannable', zoom > 1.001);

        var level = document.getElementById('tvZoomLevel');
        if (level) level.textContent = Math.round(zoom * 100) + '%';
    }

    /* ---------- فتح / إغلاق ---------- */
    function openViewer(id) {
        var item = findItem(id);
        var modal = document.getElementById('timetableViewer');
        var img = document.getElementById('tvImage');
        if (!item || !modal || !img) return;

        document.getElementById('tvTitle').textContent = itemTitle(item);
        document.getElementById('tvMeta').textContent = itemMeta(item);

        var dl = document.getElementById('tvDownload');
        dl.setAttribute('href', item.image);
        dl.setAttribute('download', itemDownload(item));
        document.getElementById('tvOpen').setAttribute('href', item.image);

        tv.naturalW = 0;
        tv.naturalH = 0;

        function ready() {
            tv.naturalW = img.naturalWidth;
            tv.naturalH = img.naturalHeight;
            computeFit();
            applyZoom(1);
        }

        img.onload = ready;
        img.alt = itemAlt(item);
        img.src = item.image;
        if (img.complete && img.naturalWidth) ready();

        tv.lastFocus = document.activeElement;
        modal.classList.add('is-open');
        document.body.classList.add('no-scroll');
        tv.open = true;
        tv.openedAt = Date.now();
        var closeBtn = document.getElementById('tvClose');
        if (closeBtn) closeBtn.focus();
    }

    function closeViewer() {
        var modal = document.getElementById('timetableViewer');
        if (!modal || !tv.open) return;
        modal.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
        tv.open = false;
        var img = document.getElementById('tvImage');
        if (img) img.removeAttribute('src');
        if (tv.lastFocus && typeof tv.lastFocus.focus === 'function') tv.lastFocus.focus();
    }

    /* ---------- التهيئة ---------- */
    function initViewer() {
        var modal = document.getElementById('timetableViewer');
        if (!modal) return;

        /* حماية من «النقرة الشبحية» التي قد تصل لأزرار العارض في نفس لحظة الفتح */
        function closeFromPointer() {
            if (Date.now() - tv.openedAt < 250) return;
            closeViewer();
        }

        document.getElementById('tvClose').addEventListener('click', closeFromPointer);
        document.getElementById('tvZoomIn').addEventListener('click', function () { applyZoom(tv.zoom * 1.25); });
        document.getElementById('tvZoomOut').addEventListener('click', function () { applyZoom(tv.zoom / 1.25); });
        document.getElementById('tvReset').addEventListener('click', function () { applyZoom(1); });

        var backdrop = modal.querySelector('.tv-backdrop');
        if (backdrop) backdrop.addEventListener('click', closeFromPointer);

        var stage = document.getElementById('tvStage');

        // تكبير بعجلة الفأرة
        stage.addEventListener('wheel', function (e) {
            if (!tv.open) return;
            e.preventDefault();
            applyZoom(tv.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e);
        }, { passive: false });

        // سحب الصورة للتحرك
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var startLeft = 0;
        var startTop = 0;

        stage.addEventListener('pointerdown', function (e) {
            if (!tv.open || tv.zoom <= 1.001) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = stage.scrollLeft;
            startTop = stage.scrollTop;
            stage.classList.add('is-dragging');
            if (stage.setPointerCapture) {
                try { stage.setPointerCapture(e.pointerId); } catch (err) { /* لا شيء */ }
            }
        });

        stage.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            stage.scrollLeft = startLeft - (e.clientX - startX);
            stage.scrollTop = startTop - (e.clientY - startY);
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            stage.classList.remove('is-dragging');
            if (stage.releasePointerCapture) {
                try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* لا شيء */ }
            }
        }

        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);
        stage.addEventListener('pointerleave', endDrag);

        // نقرة مزدوجة للتكبير السريع
        stage.addEventListener('dblclick', function () {
            applyZoom(tv.zoom > 1.2 ? 1 : 2.5);
        });

        // لوحة المفاتيح
        document.addEventListener('keydown', function (e) {
            if (!tv.open) return;
            if (e.key === 'Escape') {
                closeViewer();
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                applyZoom(tv.zoom * 1.25);
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                applyZoom(tv.zoom / 1.25);
            } else if (e.key === '0') {
                e.preventDefault();
                applyZoom(1);
            }
        });

        // إعادة الحساب عند تغيير حجم النافذة
        window.addEventListener('resize', function () {
            if (!tv.open) return;
            computeFit();
            applyZoom(tv.zoom);
        });

        // فتح الجدول من البطاقات (نقرة أو Enter/مسافة)
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest ? e.target.closest('[data-tt]') : null;
            if (trigger) openViewer(trigger.getAttribute('data-tt'));
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var trigger = e.target.getAttribute ? e.target.getAttribute('data-tt') : null;
            if (trigger) {
                e.preventDefault();
                openViewer(trigger);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderTimetables();
        initViewer();
    });
})();
