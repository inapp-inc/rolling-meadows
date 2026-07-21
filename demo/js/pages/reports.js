/* global RM */
(function () {
	'use strict';

	var storeListenerBound = false;

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeNav: 'reports',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					renderAuditorPage();
					return;
				}
				renderPage();
				if (!storeListenerBound) {
					document.addEventListener('rm:store-changed', function () {
						if (RM.Permissions.isAuditor()) {
							renderAuditorPage();
						} else {
							renderPage();
						}
					});
					storeListenerBound = true;
				}
			}
		});
	});

	function renderAuditorPage() {
		RM.Components.closeSideDrawer();

		var main = document.getElementById('page-content');
		var events = RM.ReportEngine.EVENTS;
		var snapshot = RM.ReportEngine.programSnapshot();
		var riskData = RM.ReportEngine.caseloadByRisk();
		var overdueSummary = RM.ReportEngine.overdueSummary();
		var cboSummary = RM.ReportEngine.cboReferralSummary();

		main.innerHTML =
			RM.Components.pageHeader(
				'Program Audit Reports',
				'De-identified program metrics for compliance review — aggregate counts only, no individual client records.'
			) +
			RM.Components.alert('info', 'Confidentiality policy: client names, contact details, addresses, and case notes are not shown. Export files contain summary statistics only.') +
			'<div class="card-grid">' +
			RM.Components.statCard(snapshot.totalActive, 'Active Caseload', 'users', 'primary', null) +
			RM.Components.statCard(snapshot.highRisk, 'High Risk', 'chart', 'warning', null) +
			RM.Components.statCard(snapshot.overdueFollowUps, 'Overdue Follow-ups', 'clock', 'accent', null) +
			RM.Components.statCard(snapshot.openCboReferrals, 'Open CBO Referrals', 'link', 'success', null) +
			'</div>' +
			'<div class="card"><h2>Caseload by Risk Level</h2>' +
			'<p class="report-table-hint">Aggregate counts — individual clients are not listed.</p>' +
			'<div id="auditor-report-risk"></div>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="export-auditor-risk">Export summary CSV</button></div>' +
			'<div class="card"><h2>Enrollments by Program</h2>' +
			'<p class="report-table-hint">Headcount enrolled in each program — no client identifiers.</p>' +
			'<div class="form-group"><label for="auditor-report-event">Program / event</label>' +
			'<select id="auditor-report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div id="auditor-report-event-data"></div></div>' +
			'<div class="card"><h2>Overdue Follow-ups Summary</h2>' +
			'<p class="report-table-hint">Totals and breakdowns by risk level and cadence — no client names.</p>' +
			'<div id="auditor-report-overdue"></div></div>' +
			'<div class="card"><h2>Open CBO Referrals Summary</h2>' +
			'<p class="report-table-hint">Referral volume by organization and status — no client names.</p>' +
			'<div id="auditor-report-cbo"></div></div>';

		document.getElementById('auditor-report-risk').innerHTML = renderRiskTable(riskData);

		function refreshAuditorEnrollment() {
			var eventId = document.getElementById('auditor-report-event').value;
			var summary = RM.ReportEngine.enrollmentCountForEvent(eventId);
			document.getElementById('auditor-report-event-data').innerHTML =
				'<table class="data-table"><thead><tr><th>Program / event</th><th>Enrolled count</th></tr></thead><tbody>' +
				'<tr><td>' + RM.Components.escapeHtml(summary.eventName) + '</td>' +
				'<td><strong>' + summary.count + '</strong></td></tr></tbody></table>';
		}

		document.getElementById('auditor-report-event').addEventListener('change', refreshAuditorEnrollment);
		refreshAuditorEnrollment();

		document.getElementById('auditor-report-overdue').innerHTML = renderAuditorOverdueSummary(overdueSummary);
		document.getElementById('auditor-report-cbo').innerHTML = renderAuditorCboSummary(cboSummary);

		document.getElementById('export-auditor-risk').addEventListener('click', function () {
			RM.Components.exportCsv('audit-caseload-by-risk.csv', riskData, [
				{ key: 'riskLevel', label: 'Risk Level' }, { key: 'count', label: 'Count' }
			]);
		});
	}

	function renderAuditorOverdueSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState('No overdue follow-ups', 'All follow-ups are current.');
		}
		var riskRows = Object.keys(summary.byRisk).map(function (level) {
			return '<tr><td>' + RM.Components.riskBadge(level) + '</td><td>' + summary.byRisk[level] + '</td></tr>';
		}).join('');
		var cadenceRows = Object.keys(summary.byCadence).map(function (cadence) {
			return '<tr><td>' + RM.Components.escapeHtml(cadence) + '</td><td>' + summary.byCadence[cadence] + '</td></tr>';
		}).join('');
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> overdue follow-up' +
			(summary.total === 1 ? '' : 's') + ' program-wide.</p>' +
			'<div class="auditor-summary-grid">' +
			'<div><h3>By risk level</h3><table class="data-table"><thead><tr><th>Risk</th><th>Count</th></tr></thead><tbody>' +
			riskRows + '</tbody></table></div>' +
			'<div><h3>By cadence</h3><table class="data-table"><thead><tr><th>Cadence</th><th>Count</th></tr></thead><tbody>' +
			cadenceRows + '</tbody></table></div></div>';
	}

	function renderAuditorCboSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState('No open CBO referrals', 'All referrals confirmed.');
		}
		var statusRows = Object.keys(summary.byStatus).map(function (status) {
			return '<tr><td>' + RM.Components.escapeHtml(status) + '</td><td>' + summary.byStatus[status] + '</td></tr>';
		}).join('');
		var cboRows = Object.keys(summary.byCbo).map(function (cbo) {
			return '<tr><td>' + RM.Components.escapeHtml(cbo) + '</td><td>' + summary.byCbo[cbo] + '</td></tr>';
		}).join('');
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> open referral' +
			(summary.total === 1 ? '' : 's') + ' pending confirmation.</p>' +
			'<div class="auditor-summary-grid">' +
			'<div><h3>By status</h3><table class="data-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>' +
			statusRows + '</tbody></table></div>' +
			'<div><h3>By organization</h3><table class="data-table"><thead><tr><th>CBO</th><th>Count</th></tr></thead><tbody>' +
			cboRows + '</tbody></table></div></div>';
	}

	function renderPage() {
		RM.Components.closeSideDrawer();

		var main = document.getElementById('page-content');
		var user = RM.Session.getCurrentUser();
		var events = RM.ReportEngine.EVENTS;
		var riskGroups = RM.Data.groupByRisk(RM.Data.activeClients());

		main.innerHTML =
			RM.Components.pageHeader('Reports & Dashboards', 'Live reports from your case data — no manual recompilation required.') +
			'<div class="form-group"><label for="report-event">Event for enrollment report</label>' +
			'<select id="report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div class="card"><h2>Caseload by Risk Level</h2>' +
			'<p class="report-table-hint">Click a risk level row to view clients in a side panel.</p>' +
			'<div id="report-risk"></div>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="export-risk">Export CSV</button></div>' +
			'<div class="card"><h2>Seniors Enrolled in Event</h2>' +
			'<p class="report-table-hint">Click a row to view enrollment details and open the case.</p>' +
			'<div id="report-event-data"></div>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="export-event">Export CSV</button></div>' +
			'<div class="card"><h2>Overdue Follow-ups</h2>' +
			'<p class="report-table-hint">Click a row to view follow-up details and open the case.</p>' +
			'<div id="report-overdue"></div>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="export-overdue">Export CSV</button></div>' +
			'<div class="card"><h2>Open CBO Referrals</h2>' +
			'<p class="report-table-hint">Click a row to view referral details and open the case.</p>' +
			'<div id="report-cbo"></div></div>';

		var riskData = RM.ReportEngine.caseloadByRisk();
		document.getElementById('report-risk').innerHTML = renderRiskTable(riskData);
		wireRiskDrilldown(riskGroups);

		function refreshEventReport() {
			var eventId = document.getElementById('report-event').value;
			var eventData = RM.ReportEngine.enrolledInEvent(eventId);
			document.getElementById('report-event-data').innerHTML = eventData.length
				? renderEnrollmentTable(eventData)
				: RM.Components.emptyState('No enrollments', 'Bulk-enroll clients to see them here live.');
			wireEnrollmentDrilldown(eventData);
		}

		document.getElementById('report-event').addEventListener('change', refreshEventReport);
		refreshEventReport();

		var overdueData = RM.ReportEngine.overdueFollowUps(user.role === 'case_manager' ? user.id : null);
		document.getElementById('report-overdue').innerHTML = overdueData.length
			? renderOverdueTable(overdueData)
			: RM.Components.emptyState('No overdue follow-ups', 'All follow-ups are current.');
		wireOverdueDrilldown(overdueData);

		var cboData = RM.ReportEngine.openCBOReferrals();
		document.getElementById('report-cbo').innerHTML = cboData.length
			? renderCboTable(cboData)
			: RM.Components.emptyState('No open CBO referrals', 'All referrals confirmed.');
		wireCboDrilldown(cboData);

		document.getElementById('export-risk').addEventListener('click', function () {
			RM.Components.exportCsv('caseload-by-risk.csv', riskData, [
				{ key: 'riskLevel', label: 'Risk Level' }, { key: 'count', label: 'Count' }
			]);
		});
		document.getElementById('export-event').addEventListener('click', function () {
			var eventId = document.getElementById('report-event').value;
			RM.Components.exportCsv('event-enrollment.csv', RM.ReportEngine.enrolledInEvent(eventId), [
				{ key: 'clientName', label: 'Client' },
				{ key: 'dateEnrolled', label: 'Date Enrolled' },
				{ key: 'eventName', label: 'Event' }
			]);
		});
		document.getElementById('export-overdue').addEventListener('click', function () {
			RM.Components.exportCsv('overdue-followups.csv', overdueData, [
				{ key: 'clientName', label: 'Client' },
				{ key: 'riskLevel', label: 'Risk' },
				{ key: 'cadence', label: 'Cadence' },
				{ key: 'daysOverdue', label: 'Days Overdue' }
			]);
		});
	}

	function renderRiskTable(rows) {
		if (!rows.length) {
			return RM.Components.emptyState('No risk data', 'Complete assessments to populate this report.');
		}
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Risk Level</th><th>Count</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="risk-row" data-risk="' + RM.Components.escapeHtml(row.riskLevel) + '" role="button" tabindex="0" aria-label="' +
					row.count + ' clients at ' + row.riskLevel + ' risk, click to view">' +
					'<td>' + RM.Components.riskBadge(row.riskLevel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.count) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireRiskDrilldown(riskGroups) {
		var table = document.querySelector('#report-risk .data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.risk-row', function (row) {
			var level = row.getAttribute('data-risk');
			openRiskDrawer(level, riskGroups[level] || []);
		});
	}

	function openRiskDrawer(level, clients) {
		var title = level + ' risk — ' + clients.length + ' client' + (clients.length === 1 ? '' : 's');
		var table = document.querySelector('#report-risk .data-table-interactive');
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.risk-row').forEach(function (r) { r.classList.remove('active'); });
			}
		});
	}

	function renderOverdueTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Client</th><th>Risk</th><th>Cadence</th><th>Days Overdue</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="overdue-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(row.clientName) + ', ' + row.daysOverdue + ' days overdue, click for details">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.riskBadge(row.riskLevel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.cadence) + '</td>' +
					'<td><strong>' + RM.Components.escapeHtml(row.daysOverdue) + '</strong></td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireOverdueDrilldown(overdueData) {
		var table = document.querySelector('#report-overdue .data-table-interactive');
		var byClientId = {};
		overdueData.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.overdue-row', function (row) {
			openOverdueDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openOverdueDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var notes = RM.CaseNoteRepository.findByClientId(client.id);
		var latestNote = notes.length
			? notes.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]
			: null;

		RM.Components.openClientDrawer(
			'Overdue follow-up — ' + client.name,
			client,
			{
				workspaceTab: 'followup',
				includeStandardMeta: false,
				includeStandardSections: false,
				badgeHtml: '<span class="incomplete-badge">' + row.daysOverdue + ' days overdue</span>',
				alert: {
					type: 'warning',
					message: 'Recommended cadence: ' + row.cadence + '. Last contact exceeds this window.'
				},
				metaRows: [
					{ label: 'Days overdue', value: row.daysOverdue },
					{ label: 'Cadence', value: row.cadence },
					{ label: 'Risk level', value: row.riskLevel },
					{ label: 'Phone', value: client.phone },
					{
						label: 'Case manager',
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: [{
					title: 'Last follow-up',
					body: latestNote
						? '<div class="note-entry drawer-note">' +
							'<div class="note-meta">' + RM.Components.formatDate(latestNote.date) + ' · ' +
							RM.Components.escapeHtml(latestNote.type) + '</div>' +
							'<p>' + RM.Components.escapeHtml(latestNote.text) + '</p></div>'
						: '<p>No case notes logged yet. Open the workspace to log the first follow-up.</p>'
				}]
			},
			table,
			'.overdue-row'
		);
	}

	function renderEnrollmentTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Client</th><th>Date Enrolled</th><th>Event</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="enrollment-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(row.clientName) + ' enrolled in ' + row.eventName + ', click for details">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.dateEnrolled) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.eventName) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireEnrollmentDrilldown(enrollmentData) {
		var table = document.querySelector('#report-event-data .data-table-interactive');
		var byClientId = {};
		enrollmentData.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.enrollment-row', function (row) {
			openEnrollmentDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openEnrollmentDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var enrollments = RM.ServiceEnrollmentRepository.findByClientId(client.id);
		var otherEnrollments = enrollments.filter(function (e) {
			return e.serviceOrEventId !== row.eventId;
		});

		RM.Components.openClientDrawer(
			'Enrollment — ' + client.name,
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				alert: {
					type: 'info',
					message: 'Enrolled in ' + row.eventName + ' on ' + RM.Components.formatDate(row.dateEnrolled) + '.'
				},
				metaRows: [
					{ label: 'Program / event', value: row.eventName },
					{ label: 'Date enrolled', value: RM.Components.formatDate(row.dateEnrolled) },
					{ label: 'Phone', value: client.phone },
					{ label: 'Address', value: client.address }
				],
				sections: otherEnrollments.length ? [{
					title: 'Other program enrollments',
					body: '<ul class="drawer-list">' + otherEnrollments.map(function (e) {
						var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
						return '<li>' + RM.Components.escapeHtml(ev ? ev.name : e.serviceOrEventId) +
							' — ' + RM.Components.formatDate(e.dateEnrolled) + '</li>';
					}).join('') + '</ul>'
				}] : []
			},
			table,
			'.enrollment-row'
		);
	}

	function renderCboTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Client</th><th>CBO</th><th>Status</th><th>Date</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row, idx) {
				return '<tr class="cbo-row" data-row-index="' + idx + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(row.clientName) + ' referred to ' + row.cboName + ', click for details">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.cboName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.status) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.date) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireCboDrilldown(cboData) {
		var table = document.querySelector('#report-cbo .data-table-interactive');

		RM.Components.wireInteractiveTable(table, '.cbo-row', function (row) {
			var idx = parseInt(row.getAttribute('data-row-index'), 10);
			openCboDrawer(cboData[idx], table);
		});
	}

	function openCboDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var openCbos = RM.CBOReferralRepository.findByClientId(client.id).filter(function (r) {
			return r.status === 'Pending' || r.status === 'Sent';
		});
		var otherCbos = openCbos.filter(function (r) {
			return r.cboName !== row.cboName || r.date !== row.date;
		});

		RM.Components.openClientDrawer(
			'CBO referral — ' + client.name,
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				hideStatusBadge: true,
				badgeHtml: '<span class="client-status-badge">' + RM.Components.escapeHtml(row.status) + '</span>',
				alert: {
					type: 'info',
					message: 'Open referral to ' + row.cboName + ' — follow up to confirm receipt.'
				},
				metaRows: [
					{ label: 'CBO organization', value: row.cboName },
					{ label: 'Referral status', value: row.status },
					{ label: 'Date referred', value: RM.Components.formatDate(row.date) },
					{ label: 'Phone', value: client.phone },
					{
						label: 'Case manager',
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: otherCbos.length ? [{
					title: 'Other open CBO referrals',
					body: '<ul class="drawer-list">' + otherCbos.map(function (r) {
						return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' +
							RM.Components.escapeHtml(r.status) + ' (' + RM.Components.formatDate(r.date) + ')</li>';
					}).join('') + '</ul>'
				}] : []
			},
			table,
			'.cbo-row'
		);
	}
})();
