/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'services',
			activeNav: 'bulk-enroll',
			onReady: function () {
				if (RM.Permissions.isLiaison() || RM.Permissions.isAuditor()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				if (!RM.Permissions.can('bulkEnroll')) {
					document.getElementById('page-content').innerHTML =
						RM.Components.alert('danger', 'Bulk service allocation is not available for your role.');
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var caseload = RM.Data.caseloadForUser(user);
		var riskGroups = RM.Data.groupByRisk(caseload);
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('bulk-enroll') +
			'<div class="card bulk-enrollment-card">' +
			'<div class="bulk-enroll-panel">' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="bulk-event">Program / event</label>' +
			'<select id="bulk-event">' + RM.ReportEngine.EVENTS.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div class="form-group"><label for="bulk-filter">Filter clients</label>' +
			'<select id="bulk-filter">' +
			'<option value="all">All caseload</option>' +
			'<option value="high">High risk only</option>' +
			'<option value="incomplete">Incomplete intake</option>' +
			'</select></div></div>' +
			'<fieldset class="bulk-client-fieldset"><legend>Select clients</legend>' +
			'<label class="bulk-client-check bulk-select-all">' +
			'<input type="checkbox" id="bulk-select-all"> <span>Select all visible</span></label>' +
			'<div id="bulk-client-list" class="bulk-client-list"></div></fieldset>' +
			'<div class="form-actions">' +
			'<button type="button" id="btn-bulk-enroll" class="btn btn-primary">Enroll selected</button>' +
			'<a href="' + RM.Links.page('reports') + '" class="btn btn-secondary">View enrollment reports</a>' +
			'</div></div></div>';

		renderBulkEnrollPanel(caseload, riskGroups);
	}

	function filterCaseloadForBulk(caseload, riskGroups, filter) {
		if (filter === 'high') {
			return riskGroups.High || [];
		}
		if (filter === 'incomplete') {
			return caseload.filter(function (c) { return c.incompleteIntake; });
		}
		return caseload;
	}

	function updateBulkEnrollButtonLabel(count) {
		var btn = document.getElementById('btn-bulk-enroll');
		if (!btn) { return; }
		btn.textContent = count ? 'Enroll ' + count + ' selected' : 'Enroll selected';
	}

	function renderBulkEnrollPanel(caseload, riskGroups) {
		var listEl = document.getElementById('bulk-client-list');
		var filterEl = document.getElementById('bulk-filter');
		if (!listEl || !filterEl) { return; }

		function renderList() {
			var filtered = filterCaseloadForBulk(caseload, riskGroups, filterEl.value);
			if (!filtered.length) {
				listEl.innerHTML = RM.Components.emptyState('No clients match filter', 'Try a different filter or add referrals.');
				updateBulkEnrollButtonLabel(0);
				return;
			}
			listEl.innerHTML = filtered.map(function (c) {
				var assessment = RM.RiskAssessmentRepository.findLatest(c.id);
				var meta = assessment ? assessment.overallRisk + ' risk' : 'Risk unknown';
				if (c.incompleteIntake) { meta += ' · Incomplete intake'; }
				return '<label class="bulk-client-check">' +
					'<input type="checkbox" name="bulk-client" value="' + RM.Components.escapeHtml(c.id) + '">' +
					'<span>' + RM.Components.escapeHtml(c.name) + ' <span class="bulk-client-meta">(' + RM.Components.escapeHtml(meta) + ')</span></span></label>';
			}).join('');
			updateBulkSelectionState();
		}

		function updateBulkSelectionState() {
			var boxes = listEl.querySelectorAll('input[name="bulk-client"]');
			var checked = listEl.querySelectorAll('input[name="bulk-client"]:checked');
			var selectAll = document.getElementById('bulk-select-all');
			if (selectAll) {
				selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
				selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
			}
			updateBulkEnrollButtonLabel(checked.length);
		}

		renderList();

		filterEl.addEventListener('change', renderList);

		listEl.addEventListener('change', function (e) {
			if (e.target && e.target.name === 'bulk-client') {
				updateBulkSelectionState();
			}
		});

		var selectAll = document.getElementById('bulk-select-all');
		if (selectAll) {
			selectAll.addEventListener('change', function () {
				var checked = selectAll.checked;
				listEl.querySelectorAll('input[name="bulk-client"]').forEach(function (cb) {
					cb.checked = checked;
				});
				updateBulkSelectionState();
			});
		}

		document.getElementById('btn-bulk-enroll').addEventListener('click', function () {
			var eventId = document.getElementById('bulk-event').value;
			var selected = Array.prototype.slice.call(
				document.querySelectorAll('#bulk-client-list input[name="bulk-client"]:checked')
			).map(function (cb) { return cb.value; });
			if (!selected.length) {
				RM.Components.showToast('Select at least one client.', 'warning');
				return;
			}
			var results = RM.ServiceEnrollmentRepository.bulkEnroll(
				selected, eventId, RM.Session.getCurrentUser().id
			);
			var eventName = (RM.ReportEngine.EVENTS.find(function (e) { return e.id === eventId; }) || {}).name || 'program';
			RM.Components.showToast(
				results.length ? 'Enrolled ' + results.length + ' client(s) in ' + eventName + '.' :
					'Selected clients are already enrolled in that program.',
				results.length ? 'success' : 'warning'
			);
		});
	}
})();
