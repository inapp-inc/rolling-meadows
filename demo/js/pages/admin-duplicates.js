/* global RM */
(function () {
	'use strict';

	var queuePairs = [];
	var queueListEl = null;
	var pageReady = false;

	var storeListenerBound = false;

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeNav: 'admin',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.can('mergeDuplicates')) {
					document.getElementById('page-content').innerHTML =
						RM.Components.alert('danger', 'Access denied. Supervisor / Dept Admin role required.');
					return;
				}
				initPage();
				if (!storeListenerBound) {
					document.addEventListener('rm:store-changed', refreshQueueList);
					storeListenerBound = true;
				}
			}
		});
	});

	function initPage() {
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.pageHeader(
				'Detect Duplicates',
				'Compare potential duplicate records side by side. Review details in the drawer, choose which record to keep, then merge or dismiss.'
			) +
			'<div id="queue-list" class="dup-queue"></div>';

		queueListEl = document.getElementById('queue-list');
		pageReady = true;
		refreshQueueList();
	}

	function refreshQueueList() {
		if (!pageReady || !queueListEl) { return; }

		RM.Components.closeSideDrawer();
		queuePairs = buildPairs();

		if (!queuePairs.length) {
			queueListEl.innerHTML = RM.Components.emptyState(
				'No duplicates detected',
				'Soft-matches from intake will appear here for supervisor review.'
			);
			return;
		}

		renderPairList();
	}

	function pairKey(idA, idB) {
		return [idA, idB].sort().join('|');
	}

	function getDismissedPairKeys() {
		return RM.Store.getMeta('dismissedDuplicatePairs') || [];
	}

	function dismissPair(idA, idB) {
		var key = pairKey(idA, idB);
		var dismissed = getDismissedPairKeys();
		if (dismissed.indexOf(key) === -1) {
			dismissed.push(key);
			RM.Store.setMeta('dismissedDuplicatePairs', dismissed);
		}
	}

	function isPairDismissed(idA, idB) {
		return getDismissedPairKeys().indexOf(pairKey(idA, idB)) !== -1;
	}

	function buildPairs() {
		var clients = RM.ClientRepository.findAll();
		var pairs = [];

		clients.forEach(function (c, i) {
			clients.slice(i + 1).forEach(function (c2) {
				if (isPairDismissed(c.id, c2.id)) { return; }

				var matches = RM.DeduplicationService.check({ name: c.name, phone: c.phone, dob: c.dob }, null);
				var found = matches.find(function (m) { return m.client.id === c2.id && m.score >= 25; });
				if (found) {
					pairs.push({ a: c, b: c2, fields: found.matchedFields });
				}
			});
		});

		return pairs;
	}

	function renderPairList() {
		queueListEl.innerHTML = queuePairs.map(function (p, idx) {
			return renderPairCard(p, idx);
		}).join('');

		queueListEl.querySelectorAll('[data-review-pair]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var idx = parseInt(btn.getAttribute('data-review-pair'), 10);
				openPairDrawer(queuePairs[idx], idx);
			});
		});
	}

	function formatMatchedFields(fields) {
		if (!fields.length) { return 'similar details'; }
		return fields.map(function (f) {
			if (f === 'dob') { return 'date of birth'; }
			return f;
		}).join(', ');
	}

	function renderPairCard(pair, idx) {
		return '<article class="card dup-pair-card" data-pair-index="' + idx + '">' +
			'<div class="dup-pair-header">' +
			'<div><h2 class="dup-pair-title">Potential duplicate</h2>' +
			'<p class="dup-pair-meta">Matched on ' + RM.Components.escapeHtml(formatMatchedFields(pair.fields)) + '</p></div>' +
			'<button type="button" class="btn btn-primary btn-sm" data-review-pair="' + idx + '">Review match</button>' +
			'</div>' +
			'<div class="dup-compare-columns">' +
			renderCompareColumn(pair.a, pair, 'a', false) +
			renderCompareColumn(pair.b, pair, 'b', false) +
			'</div></article>';
	}

	function renderCompareColumn(client, pair, side, selectable) {
		var snapshot = getClientSnapshot(client);
		var selected = side === 'a' ? ' checked' : '';
		var selectHtml = selectable
			? '<label class="dup-keep-choice">' +
				'<input type="radio" name="dup-keep-record" value="' + side + '"' + selected + '>' +
				'<span>Keep this record</span></label>'
			: '';

		return '<div class="dup-column' + (selectable ? ' dup-column-selectable' : '') + '" data-side="' + side + '">' +
			selectHtml +
			'<div class="dup-column-head">' +
			'<span class="dup-column-label">Record ' + side.toUpperCase() + '</span>' +
			(client.incompleteIntake ? '<span class="incomplete-badge">Incomplete intake</span>' : '') +
			'</div>' +
			renderField('Name', client.name, pair.fields.indexOf('name') !== -1) +
			renderField('Date of birth', RM.Components.formatDate(client.dob), pair.fields.indexOf('dob') !== -1) +
			renderField('Phone', client.phone, pair.fields.indexOf('phone') !== -1) +
			renderField('Address', client.address, false) +
			renderField('Referral', snapshot.referralSummary, false) +
			renderField('Intake', snapshot.intakeSummary, false) +
			renderField('Risk', snapshot.riskSummary, false) +
			(selectable ? renderField('Case notes', snapshot.noteCount + ' logged', false) : '') +
			'</div>';
	}

	function renderField(label, value, isMatch) {
		return '<div class="dup-field' + (isMatch ? ' dup-field-match' : '') + '">' +
			'<span class="dup-field-label">' + RM.Components.escapeHtml(label) + '</span>' +
			'<span class="dup-field-value">' + RM.Components.escapeHtml(value || '—') + '</span></div>';
	}

	function getClientSnapshot(client) {
		var referral = RM.ReferralRepository.findByClientId(client.id)[0];
		var intake = RM.IntakeRepository.findByClientId(client.id);
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var notes = RM.CaseNoteRepository.findByClientId(client.id);

		return {
			referralSummary: referral
				? referral.source + ' · ' + RM.Components.formatDate(referral.dateReceived)
				: 'No referral',
			intakeSummary: intake
				? (intake.completeness || 'unknown') + (intake.consentOnFile ? ' · consent on file' : ' · consent missing')
				: 'No intake',
			riskSummary: assessment ? assessment.overallRisk + ' (' + RM.Components.formatDate(assessment.date) + ')' : 'Not assessed',
			noteCount: notes.length
		};
	}

	function openPairDrawer(pair, pairIndex) {
		var bodyHtml =
			'<div class="dup-drawer">' +
			'<p class="dup-drawer-lead">Matched fields are highlighted. Select the record to keep — related data from the other record will be merged into it.</p>' +
			'<div class="dup-compare-columns dup-compare-columns-drawer">' +
			renderCompareColumn(pair.a, pair, 'a', true) +
			renderCompareColumn(pair.b, pair, 'b', true) +
			'</div>' +
			'<div class="drawer-actions dup-drawer-actions">' +
			'<button type="button" class="btn btn-primary" id="dup-drawer-merge">Merge records</button>' +
			'<button type="button" class="btn btn-secondary" id="dup-drawer-dismiss">Dismiss match</button>' +
			'</div></div>';

		RM.Components.openSideDrawer(
			'Review duplicate — ' + pair.a.name + ' / ' + pair.b.name,
			bodyHtml,
			function () {
				queueListEl.querySelectorAll('.dup-pair-card').forEach(function (card) {
					card.classList.remove('active');
				});
			}
		);

		var card = queueListEl.querySelector('[data-pair-index="' + pairIndex + '"]');
		if (card) { card.classList.add('active'); }

		var overlay = document.querySelector('.drawer-overlay.open');
		if (!overlay) { return; }

		overlay.querySelectorAll('.dup-column-selectable').forEach(function (col) {
			col.addEventListener('click', function (e) {
				if (e.target.tagName === 'INPUT') { return; }
				var radio = col.querySelector('input[type="radio"]');
				if (radio) { radio.checked = true; }
				updateKeepSelection(overlay);
			});
		});

		overlay.querySelectorAll('input[name="dup-keep-record"]').forEach(function (radio) {
			radio.addEventListener('change', function () {
				updateKeepSelection(overlay);
			});
		});

		updateKeepSelection(overlay);

		overlay.querySelector('#dup-drawer-merge').addEventListener('click', function () {
			var keepSide = overlay.querySelector('input[name="dup-keep-record"]:checked');
			if (!keepSide) { return; }
			var keepClient = keepSide.value === 'a' ? pair.a : pair.b;
			var removeClient = keepSide.value === 'a' ? pair.b : pair.a;
			if (!window.confirm(
				'Merge "' + removeClient.name + '" into "' + keepClient.name + '"? The other record will be removed.'
			)) { return; }

			RM.ClientService.mergeInto(keepClient.id, removeClient.id);
			RM.Components.showToast('Records merged — kept ' + keepClient.name + '.', 'success');
		});

		overlay.querySelector('#dup-drawer-dismiss').addEventListener('click', function () {
			dismissPair(pair.a.id, pair.b.id);
			RM.Components.closeSideDrawer();
			RM.Components.showToast('Match dismissed — these records will remain separate.', 'success');
			refreshQueueList();
		});
	}

	function updateKeepSelection(overlay) {
		overlay.querySelectorAll('.dup-column-selectable').forEach(function (col) {
			var radio = col.querySelector('input[type="radio"]');
			col.classList.toggle('dup-column-keep', !!(radio && radio.checked));
		});
	}
})();
