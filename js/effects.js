/* ============================================================
   تأثيرات الواجهة الاحترافية
   ------------------------------------------------------------
   • شريط تقدّم القراءة أعلى الصفحة
   • زر العودة إلى الأعلى
   • حركات ظهور تدريجية للبطاقات والامتحانات عند التمرير
   • ترقيم البطاقات (كتالوج) تلقائياً
   لا يحتاج هذا الملف أي تعديل على بقية الصفحة.
   ============================================================ */

(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------
       1) شريط تقدّم القراءة
       ------------------------------------------------------------ */
    function initScrollProgress() {
        var bar = document.createElement('div');
        bar.className = 'scroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        function update() {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            var percent = max > 0 ? (doc.scrollTop / max) * 100 : 0;
            bar.style.width = Math.min(100, Math.max(0, percent)).toFixed(2) + '%';
        }

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    /* ------------------------------------------------------------
       2) زر العودة إلى الأعلى
       ------------------------------------------------------------ */
    function initToTop() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'to-top';
        btn.setAttribute('aria-label', 'العودة إلى الأعلى');
        btn.setAttribute('title', 'العودة إلى الأعلى');
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        document.body.appendChild(btn);

        function update() {
            btn.classList.toggle('is-visible', window.scrollY > 420);
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* ------------------------------------------------------------
       3) ترقيم البطاقات (كتالوج 01 / 02 / ...)
       ------------------------------------------------------------ */
    var NUMBERED_GRIDS = ['departmentsGrid', 'subjectsGrid'];

    function initCardNumbers() {
        NUMBERED_GRIDS.forEach(function (id) {
            var grid = document.getElementById(id);
            if (!grid) return;

            var cards = grid.querySelectorAll('.card');
            Array.prototype.forEach.call(cards, function (card, index) {
                var badge = card.querySelector('.card-num');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'card-num';
                    badge.setAttribute('aria-hidden', 'true');
                    card.appendChild(badge);
                }
                badge.textContent = ('0' + (index + 1)).slice(-2);
            });
        });
    }

    /* ------------------------------------------------------------
       4) حركات الظهور عند التمرير
       ------------------------------------------------------------ */
    var REVEAL_SELECTORS = [
        '.section-title',
        '#departmentsGrid .card',
        '#subjectsGrid .card',
        '#examsList .exam-item',
        '#timetablesGrid .timetable-card',
        '.contact-card'
    ];

    var WATCHED_CONTAINERS = [
        'departmentsGrid',
        'subjectsGrid',
        'examsList',
        'timetablesGrid'
    ];

    function initReveal() {
        if (reduceMotion || !('IntersectionObserver' in window)) return;

        var reveals = 0;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                reveals++;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            rootMargin: '0px 0px -6% 0px',
            threshold: 0.05
        });

        function scan() {
            REVEAL_SELECTORS.forEach(function (selector) {
                var nodes = document.querySelectorAll(selector);
                Array.prototype.forEach.call(nodes, function (node) {
                    if (node.dataset.revealReady === '1') return;
                    node.dataset.revealReady = '1';

                    var parent = node.parentElement;
                    var index = parent ? Array.prototype.indexOf.call(parent.children, node) : 0;
                    var delay = Math.min(index, 7) * 65;

                    node.classList.add('reveal');
                    if (delay) node.style.transitionDelay = delay + 'ms';
                    observer.observe(node);
                });
            });

            initCardNumbers();
        }

        scan();

        /* شبكة أمان: إن لم يُبلّغ المراقب عن أي عنصر خلال مدة كافية
           (متصفح قديم أو تبويب لم يُرسم بعد) نُظهر المحتوى كاملاً
           حتى لا يبقى مخفياً أبداً. */
        window.setTimeout(function () {
            if (reveals > 0) return;
            var pending = document.querySelectorAll('.reveal:not(.is-visible)');
            Array.prototype.forEach.call(pending, function (node) {
                node.style.transitionDelay = '0ms';
                node.classList.add('is-visible');
            });
        }, 4000);

        /* البطاقات تُبنى لاحقاً بعد جلب البيانات من قاعدة البيانات */
        if ('MutationObserver' in window) {
            var mutations = new MutationObserver(scan);

            WATCHED_CONTAINERS.forEach(function (id) {
                var container = document.getElementById(id);
                if (container) mutations.observe(container, { childList: true });
            });

            var contactGrid = document.querySelector('.contact-cards');
            if (contactGrid) mutations.observe(contactGrid, { childList: true });
        }
    }

    function init() {
        initScrollProgress();
        initToTop();
        initReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
