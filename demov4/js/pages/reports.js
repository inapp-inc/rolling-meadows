/* global RM */
(function () {
	'use strict';

	var storeListenerBound = false;
	var RISK_DRILLDOWN_COLUMNS = [
		{ key: 'clientName', label: 'Client' },
		{ key: 'dob', label: 'DOB' },
		{ key: 'phone', label: 'Phone' },
		{ key: 'riskLevel', label: 'Risk Level' },
		{ key: 'compositeScore', label: 'Composite Score' },
		{ key: 'processStage', label: 'Process Stage' },
		{ key: 'caseManager', label: 'Case Manager' },
		{ key: 'intakeStatus', label: 'Intake Status' }
	];
	var ENROLLMENT_COLUMNS = [
		{ key: 'clientName', label: 'Client' },
		{ key: 'dateEnrolled', label: 'Date Enrolled' },
		{ key: 'eventName', label: 'Event' }
	];
	var OVERDUE_COLUMNS = [
		{ key: 'clientName', label: 'Client' },
		{ key: 'riskLevel', label: 'Risk' },
		{ key: 'cadence', label: 'Cadence' },
		{ key: 'daysOverdue', label: 'Days Overdue' }
	];
	var CBO_COLUMNS = [
		{ key: 'clientName', label: 'Client' },
		{ key: 'cboName', label: 'CBO' },
		{ key: 'status', label: 'Status' },
		{ key: 'date', label: 'Date' }
	];

	document.addEventListener('DOMContentLoaded', function () {
		var isAuditor = RM.Session.getCurrentUser() && RM.Permissions.isAuditor();
		RM.Boot.init({
			activeModule: 'analytics',
			activeNav: isAuditor ? 'audit-reports' : 'reports',
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
			RM.Components.modulePageHeader('audit-reports') +
			'<div class="card-grid">' +
			RM.Components.statCard(snapshot.totalActive, 'Active Caseload', 'users', 'primary', null) +
			RM.Components.statCard(snapshot.highRisk, 'High Risk', 'chart', 'warning', null) +
			RM.Components.statCard(snapshot.overdueFollowUps, 'Overdue Follow-ups', 'clock', 'accent', null) +
			RM.Components.statCard(snapshot.openCboReferrals, 'Open CBO Referrals', 'link', 'success', null) +
			'</div>' +
			'<div class="card"><div class="card-header"><h2>Caseload by Risk Level</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-risk', csvId: 'auditor-report-risk' }) +
			'</div><div id="auditor-report-risk"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Enrollments by Program</h2>' +
			RM.Components.downloadBar({ csvId: 'auditor-report-event' }) + '</div>' +
			'<div class="form-group"><label for="auditor-report-event">Program / event</label>' +
			'<select id="auditor-report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div id="auditor-report-event-data"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Overdue Follow-ups Summary</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-overdue', csvId: 'auditor-report-overdue' }) +
			'</div><div id="auditor-report-overdue"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Open CBO Referrals Summary</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-cbo', csvId: 'auditor-report-cbo' }) +
			'</div><div id="auditor-report-cbo"></div></div>';

		document.getElementById('auditor-report-risk').innerHTML = renderRiskTable(riskData);

		function refreshAuditorEnrollment() {
			var eventId = document.getElementById('auditor-report-event').value;
			var eventData = RM.ReportEngine.enrolledInEvent(eventId);
			document.getElementById('auditor-report-event-data').innerHTML = eventData.length
				? renderEnrollmentTable(eventData)
				: RM.Components.emptyState('No enrollments', 'No clients enrolled in this program yet.');
		}

		document.getElementById('auditor-report-event').addEventListener('change', refreshAuditorEnrollment);
		refreshAuditorEnrollment();

		document.getElementById('auditor-report-overdue').innerHTML = renderAuditorOverdueSummary(overdueSummary);
		document.getElementById('auditor-report-cbo').innerHTML = renderAuditorCboSummary(cboSummary);

		RM.Components.wireDownloadActions(main, {
			images: {
				'auditor-report-risk': function () {
					var total = riskData.reduce(function (sum, row) { return sum + row.count; }, 0);
					RM.Components.exportRiskBarChartPng(riskData, total, 'audit-caseload-by-risk.png');
				},
				'auditor-report-overdue': function () {
					RM.Components.exportSummaryPanelsPng(
						'Overdue follow-ups summary',
						overdueSummary.total + ' overdue follow-up' + (overdueSummary.total === 1 ? '' : 's') + ' program-wide.',
						[
							{
								title: 'By risk level',
								rows: Object.keys(overdueSummary.byRisk).map(function (level) {
									return { label: level, value: overdueSummary.byRisk[level] };
								})
							},
							{
								title: 'By cadence',
								rows: Object.keys(overdueSummary.byCadence).map(function (cadence) {
									return { label: cadence, value: overdueSummary.byCadence[cadence] };
								})
							}
						],
						'audit-overdue-followups.png'
					);
				},
				'auditor-report-cbo': function () {
					RM.Components.exportSummaryPanelsPng(
						'Open CBO referrals summary',
						cboSummary.total + ' open referral' + (cboSummary.total === 1 ? '' : 's') + ' pending confirmation.',
						[
							{
								title: 'By status',
								rows: Object.keys(cboSummary.byStatus).map(function (status) {
									return { label: status, value: cboSummary.byStatus[status] };
								})
							},
							{
								title: 'By organization',
								rows: Object.keys(cboSummary.byCbo).map(function (cbo) {
									return { label: cbo, value: cboSummary.byCbo[cbo] };
								})
							}
						],
						'audit-cbo-referrals.png'
					);
				}
			},
			csv: {
				'auditor-report-risk': function () {
					RM.Components.exportXlsx(
						'audit-caseload-by-risk-detail.xlsx',
						RM.ReportEngine.caseloadRiskDrilldown(null),
						RISK_DRILLDOWN_COLUMNS,
						{ title: 'Audit — caseload by risk (client detail)', sheetName: 'Risk detail' }
					);
				},
				'auditor-report-event': function () {
					var eventId = document.getElementById('auditor-report-event').value;
					var eventData = RM.ReportEngine.enrolledInEvent(eventId);
					RM.Components.exportXlsx(
						'audit-event-enrollment-detail.xlsx',
						eventData,
						ENROLLMENT_COLUMNS,
						{
							title: 'Audit — enrollments by program',
							sheetName: 'Enrollments'
						}
					);
				},
				'auditor-report-overdue': function () {
					RM.Components.exportXlsx(
						'audit-overdue-followups-detail.xlsx',
						RM.ReportEngine.overdueFollowUps(null),
						OVERDUE_COLUMNS,
						{ title: 'Audit — overdue follow-ups (client detail)', sheetName: 'Overdue' }
					);
				},
				'auditor-report-cbo': function () {
					RM.Components.exportXlsx(
						'audit-cbo-referrals-detail.xlsx',
						RM.ReportEngine.openCBOReferrals(),
						CBO_COLUMNS,
						{ title: 'Audit — open CBO referrals (client detail)', sheetName: 'CBO referrals' }
					);
				}
			}
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
			RM.Components.modulePageHeader('reports') +
			'<div class="card"><div class="card-header"><h2>Caseload by Risk Level</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-risk', csvId: 'report-risk' }) +
			'</div><div id="report-risk"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Clients Enrolled in Event</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-event-data', csvId: 'report-event' }) + '</div>' +
			'<div class="form-group"><label for="report-event">Event for enrollment report</label>' +
			'<select id="report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div id="report-event-data"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Overdue Follow-ups</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-overdue', csvId: 'report-overdue' }) +
			'</div><div id="report-overdue"></div></div>' +
			'<div class="card"><div class="card-header"><h2>Open CBO Referrals</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-cbo', csvId: 'report-cbo' }) +
			'</div><div id="report-cbo"></div></div>';

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

		RM.Components.wireDownloadActions(main, {
			images: {
				'report-risk': function () {
					var total = riskData.reduce(function (sum, row) { return sum + row.count; }, 0);
					RM.Components.exportRiskBarChartPng(riskData, total, 'caseload-by-risk.png');
				},
				'report-event-data': function () {
					var eventId = document.getElementById('report-event').value;
					var eventData = RM.ReportEngine.enrolledInEvent(eventId);
					var event = RM.ReportEngine.EVENTS.find(function (e) { return e.id === eventId; });
					RM.Components.exportDataTablePng(
						'Clients enrolled in event',
						ENROLLMENT_COLUMNS,
						eventData,
						'event-enrollment.png',
						{ subtitle: event ? event.name : 'Selected program' }
					);
				},
				'report-overdue': function () {
					RM.Components.exportDataTablePng(
						'Overdue follow-ups',
						OVERDUE_COLUMNS,
						overdueData,
						'overdue-followups.png'
					);
				},
				'report-cbo': function () {
					RM.Components.exportDataTablePng(
						'Open CBO referrals',
						CBO_COLUMNS,
						cboData,
						'open-cbo-referrals.png'
					);
				}
			},
			csv: {
				'report-risk': function () {
					RM.Components.exportXlsx(
						'caseload-by-risk-detail.xlsx',
						RM.ReportEngine.caseloadRiskDrilldown(user.role === 'case_manager' ? user.id : null),
						RISK_DRILLDOWN_COLUMNS,
						{ title: 'Caseload by risk — client detail', sheetName: 'Risk detail' }
					);
				},
				'report-event': function () {
					var eventId = document.getElementById('report-event').value;
					RM.Components.exportXlsx(
						'event-enrollment-detail.xlsx',
						RM.ReportEngine.enrolledInEvent(eventId),
						ENROLLMENT_COLUMNS,
						{ title: 'Clients enrolled in event', sheetName: 'Enrollments' }
					);
				},
				'report-overdue': function () {
					RM.Components.exportXlsx(
						'overdue-followups-detail.xlsx',
						RM.ReportEngine.overdueFollowUps(user.role === 'case_manager' ? user.id : null),
						OVERDUE_COLUMNS,
						{ title: 'Overdue follow-ups — client detail', sheetName: 'Overdue' }
					);
				},
				'report-cbo': function () {
					RM.Components.exportXlsx(
						'open-cbo-referrals-detail.xlsx',
						cboData,
						CBO_COLUMNS,
						{ title: 'Open CBO referrals — client detail', sheetName: 'CBO referrals' }
					);
				}
			}
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
