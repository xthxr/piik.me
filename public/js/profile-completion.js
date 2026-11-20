/* global module */
// Profile completion score for the bio-link editor.
// computeProfileCompletion() is pure so it can be unit tested in node;
// the render helper only runs in the browser.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ProfileCompletion = factory();
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const DISMISS_KEY = 'piik-profile-completion-dismissed';

    function clean(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function countLinks(links) {
        return Array.isArray(links) ? links.filter((l) => l && clean(l.title) && clean(l.url)).length : 0;
    }

    // Each check is worth the same share of the score.
    const CHECKS = [
        { id: 'name', label: 'Add your name', done: (p) => !!clean(p.name) },
        { id: 'description', label: 'Write a short bio', done: (p) => clean(p.description).length >= 20 },
        { id: 'picture', label: 'Upload a profile photo', done: (p) => !!clean(p.profilePicture) },
        { id: 'social', label: 'Connect at least one social profile', done: (p) => Object.values(p.social || {}).some((v) => !!clean(v)) },
        { id: 'links', label: 'Add at least one link', done: (p) => countLinks(p.links) >= 1 },
        { id: 'links3', label: 'Add three or more links', done: (p) => countLinks(p.links) >= 3 },
    ];

    function computeProfileCompletion(profile) {
        const p = profile || {};
        const items = CHECKS.map((c) => ({ id: c.id, label: c.label, done: !!c.done(p) }));
        const doneCount = items.filter((i) => i.done).length;
        return {
            percent: Math.round((doneCount / items.length) * 100),
            items,
            missing: items.filter((i) => !i.done),
        };
    }

    // Dismissed ids for this page session, so a dismiss still sticks
    // when localStorage is blocked or full.
    const sessionDismissed = new Set();

    function readDismissed() {
        let stored = [];
        try {
            const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
            if (Array.isArray(raw)) stored = raw;
        } catch {
            // unreadable storage: fall back to the in-memory set only
        }
        return Array.from(new Set([...stored, ...sessionDismissed]));
    }

    function dismiss(id) {
        sessionDismissed.add(id);
        try {
            localStorage.setItem(DISMISS_KEY, JSON.stringify(readDismissed()));
        } catch {
            // storage unavailable: the id stays hidden for this session only
        }
    }

    function renderProfileCompletion(profile, container) {
        if (!container) return;
        const result = computeProfileCompletion(profile);
        const dismissed = readDismissed();
        const suggestions = result.missing.filter((m) => !dismissed.includes(m.id));

        container.textContent = '';

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-weight:600;margin-bottom:8px;';
        const title = document.createElement('span');
        title.textContent = 'Profile completion';
        const pct = document.createElement('span');
        pct.textContent = result.percent + '%';
        head.append(title, pct);

        const bar = document.createElement('div');
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        bar.setAttribute('aria-valuenow', String(result.percent));
        bar.setAttribute('aria-label', 'Profile completion');
        bar.style.cssText = 'height:8px;border-radius:4px;background:#e5e7eb;overflow:hidden;';
        const fill = document.createElement('div');
        fill.style.cssText = 'height:100%;background:#06b6d4;transition:width .3s;width:' + result.percent + '%;';
        bar.appendChild(fill);

        container.append(head, bar);

        if (result.percent === 100) {
            const done = document.createElement('p');
            done.style.cssText = 'margin:10px 0 0;font-size:14px;color:#047857;';
            done.textContent = 'Your profile is complete.';
            container.appendChild(done);
            return;
        }

        if (suggestions.length) {
            const list = document.createElement('ul');
            list.style.cssText = 'list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px;';
            suggestions.forEach((s) => {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:14px;';
                const text = document.createElement('span');
                text.textContent = s.label;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Dismiss';
                btn.setAttribute('aria-label', 'Dismiss suggestion: ' + s.label);
                btn.style.cssText = 'background:none;border:none;color:#6b7280;cursor:pointer;font-size:13px;';
                btn.addEventListener('click', () => {
                    dismiss(s.id);
                    renderProfileCompletion(profile, container);
                });
                li.append(text, btn);
                list.appendChild(li);
            });
            container.appendChild(list);
        }
    }

    return { computeProfileCompletion, renderProfileCompletion, dismiss, readDismissed };
});
