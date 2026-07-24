/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var storeListenerBound = false;

	function riskDrilldownColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'riskLevel', label: t('pages.reports.riskLevel') },
			{ key: 'compositeScore', label: t('pages.reports.compositeScore') },
			{ key: 'processStage', label: t('pages.reports.processStage') },
			{ key: 'caseManager', label: t('pages.reports.caseManager') },
			{ key: 'intakeStatus', label: t('pages.reports.intakeStatus') }
		];
	}

	function enrollmentColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dateEnrolled', label: t('pages.reports.dateEnrolled') },
			{ key: 'eventName', label: t('pages.reports.event') }
		];
	}

	function overdueColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'riskLevel', label: t('pages.reports.risk') },
			{ key: 'cadence', label: t('pages.reports.cadence') },
			{ key: 'daysOverdue', label: t('pages.reports.daysOverdue') }
		];
	}

	function cboColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'cboName', label: t('pages.reports.cbo') },
			{ key: 'status', label: t('pages.reports.status') },
			{ key: 'date', label: t('pages.reports.date') }
		];
	}

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
		var events = RM.ReportEngine.localizedEvents();
		var snapshot = RM.ReportEngine.programSnapshot();
		var riskData = RM.ReportEngine.caseloadByRisk();
		var overdueSummary = RM.ReportEngine.overdueSummary();
		var cboSummary = RM.ReportEngine.cboReferralSummary();

		main.innerHTML =
			RM.Components.modulePageHeader('audit-reports') +
			'<div class="card-grid">' +
			RM.Components.statCard(snapshot.totalActive, t('pages.reports.activeCaseload'), 'users', 'primary', null) +
			RM.Components.statCard(snapshot.highRisk, t('pages.reports.highRisk'), 'chart', 'warning', null) +
			RM.Components.statCard(snapshot.overdueFollowUps, t('pages.reports.overdueFollowUpsStat'), 'clock', 'accent', null) +
			RM.Components.statCard(snapshot.openCboReferrals, t('pages.reports.openCboStat'), 'link', 'success', null) +
			'</div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.caseloadByRisk')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-risk', csvId: 'auditor-report-risk' }) +
			'</div><div id="auditor-report-risk"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.enrollmentsByProgram')) + '</h2>' +
			RM.Components.downloadBar({ csvId: 'auditor-report-event' }) + '</div>' +
			'<div class="form-group"><label for="auditor-report-event">' + RM.Components.escapeHtml(t('pages.reports.programEvent')) + '</label>' +
			'<select id="auditor-report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div id="auditor-report-event-data"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.overdueSummary')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-overdue', csvId: 'auditor-report-overdue' }) +
			'</div><div id="auditor-report-overdue"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.cboSummary')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'auditor-report-cbo', csvId: 'auditor-report-cbo' }) +
			'</div><div id="auditor-report-cbo"></div></div>';

		document.getElementById('auditor-report-risk').innerHTML = renderRiskTable(riskData);

		function refreshAuditorEnrollment() {
			var eventId = document.getElementById('auditor-report-event').value;
			var eventData = RM.ReportEngine.enrolledInEvent(eventId);
			document.getElementById('auditor-report-event-data').innerHTML = eventData.length
				? renderEnrollmentTable(eventData)
				: RM.Components.emptyState(t('pages.reports.noEnrollments'), t('pages.reports.noEnrollmentsAuditor'));
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
						t('pages.reports.exportOverdueSummaryTitle'),
						overdueSummary.total === 1
							? t('pages.reports.overdueProgramWide', { count: overdueSummary.total })
							: t('pages.reports.overdueProgramWidePlural', { count: overdueSummary.total }),
						[
							{
								title: t('pages.reports.byRiskLevel'),
								rows: Object.keys(overdueSummary.byRisk).map(function (level) {
									return { label: RM.I18n.riskLabel(level), value: overdueSummary.byRisk[level] };
								})
							},
							{
								title: t('pages.reports.byCadence'),
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
						t('pages.reports.exportCboSummaryTitle'),
						cboSummary.total === 1
							? t('pages.reports.openReferralsPending', { count: cboSummary.total })
							: t('pages.reports.openReferralsPendingPlural', { count: cboSummary.total }),
						[
							{
								title: t('pages.reports.byStatus'),
								rows: Object.keys(cboSummary.byStatus).map(function (status) {
									return { label: RM.I18n.enumLabel('cboStatus', status), value: cboSummary.byStatus[status] };
								})
							},
							{
								title: t('pages.reports.byOrganization'),
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
						riskDrilldownColumns(),
						{ title: t('pages.reports.auditRiskDetail'), sheetName: t('pages.reports.sheetRiskDetail') }
					);
				},
				'auditor-report-event': function () {
					var eventId = document.getElementById('auditor-report-event').value;
					var eventData = RM.ReportEngine.enrolledInEvent(eventId);
					RM.Components.exportXlsx(
						'audit-event-enrollment-detail.xlsx',
						eventData,
						enrollmentColumns(),
						{
							title: t('pages.reports.auditEnrollments'),
							sheetName: t('pages.reports.sheetEnrollments')
						}
					);
				},
				'auditor-report-overdue': function () {
					RM.Components.exportXlsx(
						'audit-overdue-followups-detail.xlsx',
						RM.ReportEngine.overdueFollowUps(null),
						overdueColumns(),
						{ title: t('pages.reports.auditOverdueDetail'), sheetName: t('pages.reports.sheetOverdue') }
					);
				},
				'auditor-report-cbo': function () {
					RM.Components.exportXlsx(
						'audit-cbo-referrals-detail.xlsx',
						RM.ReportEngine.openCBOReferrals(),
						cboColumns(),
						{ title: t('pages.reports.auditCboDetail'), sheetName: t('pages.reports.sheetCbo') }
					);
				}
			}
		});
	}

	function renderAuditorOverdueSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState(t('pages.reports.noOverdue'), t('pages.reports.noOverdueHint'));
		}
		var riskRows = Object.keys(summary.byRisk).map(function (level) {
			return '<tr><td>' + RM.Components.riskBadge(level) + '</td><td>' + summary.byRisk[level] + '</td></tr>';
		}).join('');
		var cadenceRows = Object.keys(summary.byCadence).map(function (cadence) {
			return '<tr><td>' + RM.Components.escapeHtml(cadence) + '</td><td>' + summary.byCadence[cadence] + '</td></tr>';
		}).join('');
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> ' +
			(summary.total === 1
				? t('pages.reports.overdueProgramWide', { count: summary.total })
				: t('pages.reports.overdueProgramWidePlural', { count: summary.total })) + '</p>' +
			'<div class="auditor-summary-grid">' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.byRiskLevel')) + '</h3><table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(t('pages.reports.risk')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			riskRows + '</tbody></table></div>' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.byCadence')) + '</h3><table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(t('pages.reports.cadence')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			cadenceRows + '</tbody></table></div></div>';
	}

	function renderAuditorCboSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState(t('pages.reports.noOpenCbo'), t('pages.reports.noOpenCboHint'));
		}
		var statusRows = Object.keys(summary.byStatus).map(function (status) {
			return '<tr><td>' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', status)) + '</td><td>' + summary.byStatus[status] + '</td></tr>';
		}).join('');
		var cboRows = Object.keys(summary.byCbo).map(function (cbo) {
			return '<tr><td>' + RM.Components.escapeHtml(cbo) + '</td><td>' + summary.byCbo[cbo] + '</td></tr>';
		}).join('');
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> ' +
			(summary.total === 1
				? t('pages.reports.openReferralsPending', { count: summary.total })
				: t('pages.reports.openReferralsPendingPlural', { count: summary.total })) + '</p>' +
			'<div class="auditor-summary-grid">' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.byStatus')) + '</h3><table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(t('pages.reports.status')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			statusRows + '</tbody></table></div>' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.byOrganization')) + '</h3><table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(t('pages.reports.cbo')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			cboRows + '</tbody></table></div></div>';
	}

	function renderPage() {
		RM.Components.closeSideDrawer();

		var main = document.getElementById('page-content');
		var user = RM.Session.getCurrentUser();
		var events = RM.ReportEngine.localizedEvents();
		var riskGroups = RM.Data.groupByRisk(RM.Data.activeClients());

		main.innerHTML =
			RM.Components.modulePageHeader('reports') +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.caseloadByRisk')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-risk', csvId: 'report-risk' }) +
			'</div><div id="report-risk"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.clientsEnrolledInEvent')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-event-data', csvId: 'report-event' }) + '</div>' +
			'<div class="form-group"><label for="report-event">' + RM.Components.escapeHtml(t('pages.reports.eventForReport')) + '</label>' +
			'<select id="report-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div id="report-event-data"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.overdueFollowUps')) + '</h2>' +
			RM.Components.downloadBar({ imageTarget: 'report-overdue', csvId: 'report-overdue' }) +
			'</div><div id="report-overdue"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.reports.openCboReferrals')) + '</h2>' +
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
				: RM.Components.emptyState(t('pages.reports.noEnrollments'), t('pages.reports.noEnrollmentsHint'));
			wireEnrollmentDrilldown(eventData);
		}

		document.getElementById('report-event').addEventListener('change', refreshEventReport);
		refreshEventReport();

		var overdueData = RM.ReportEngine.overdueFollowUps(user.role === 'case_manager' ? user.id : null);
		document.getElementById('report-overdue').innerHTML = overdueData.length
			? renderOverdueTable(overdueData)
			: RM.Components.emptyState(t('pages.reports.noOverdue'), t('pages.reports.noOverdueHint'));
		wireOverdueDrilldown(overdueData);

		var cboData = RM.ReportEngine.openCBOReferrals();
		document.getElementById('report-cbo').innerHTML = cboData.length
			? renderCboTable(cboData)
			: RM.Components.emptyState(t('pages.reports.noOpenCbo'), t('pages.reports.noOpenCboHint'));
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
					var eventName = RM.ReportEngine.eventName(eventId);
					RM.Components.exportDataTablePng(
						t('pages.reports.exportEnrollmentTitle'),
						enrollmentColumns(),
						eventData,
						'event-enrollment.png',
						{ subtitle: eventName || t('pages.reports.exportSelectedProgram') }
					);
				},
				'report-overdue': function () {
					RM.Components.exportDataTablePng(
						t('pages.reports.exportOverdueTitle'),
						overdueColumns(),
						overdueData,
						'overdue-followups.png'
					);
				},
				'report-cbo': function () {
					RM.Components.exportDataTablePng(
						t('pages.reports.exportCboTitle'),
						cboColumns(),
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
						riskDrilldownColumns(),
						{ title: t('pages.reports.caseloadRiskDetail'), sheetName: t('pages.reports.sheetRiskDetail') }
					);
				},
				'report-event': function () {
					var eventId = document.getElementById('report-event').value;
					RM.Components.exportXlsx(
						'event-enrollment-detail.xlsx',
						RM.ReportEngine.enrolledInEvent(eventId),
						enrollmentColumns(),
						{ title: t('pages.reports.eventEnrollmentDetail'), sheetName: t('pages.reports.sheetEnrollments') }
					);
				},
				'report-overdue': function () {
					RM.Components.exportXlsx(
						'overdue-followups-detail.xlsx',
						RM.ReportEngine.overdueFollowUps(user.role === 'case_manager' ? user.id : null),
						overdueColumns(),
						{ title: t('pages.reports.overdueDetail'), sheetName: t('pages.reports.sheetOverdue') }
					);
				},
				'report-cbo': function () {
					RM.Components.exportXlsx(
						'open-cbo-referrals-detail.xlsx',
						cboData,
						cboColumns(),
						{ title: t('pages.reports.cboDetail'), sheetName: t('pages.reports.sheetCbo') }
					);
				}
			}
		});
	}

	function renderRiskTable(rows) {
		if (!rows.length) {
			return RM.Components.emptyState(t('pages.reports.noRiskData'), t('pages.reports.noRiskDataHint'));
		}
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.riskLevel')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="risk-row" data-risk="' + RM.Components.escapeHtml(row.riskLevel) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.riskDrilldownAria', { count: row.count, level: RM.I18n.riskLabel(row.riskLevel) })) + '">' +
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
		var levelLabel = RM.I18n.riskLabel(level);
		var title = clients.length === 1
			? t('pages.reports.riskDrawerTitle', { level: levelLabel, count: clients.length })
			: t('pages.reports.riskDrawerTitlePlural', { level: levelLabel, count: clients.length });
		var table = document.querySelector('#report-risk .data-table-interactive');
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.risk-row').forEach(function (r) { r.classList.remove('active'); });
			}
		});
	}

	function renderOverdueTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.risk')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.cadence')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.daysOverdue')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="overdue-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.overdueRowAria', { name: row.clientName, days: row.daysOverdue })) + '">' +
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
			t('pages.reports.overdueDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'followup',
				includeStandardMeta: false,
				includeStandardSections: false,
				badgeHtml: '<span class="incomplete-badge">' + RM.Components.escapeHtml(t('pages.reports.daysOverdueBadge', { count: row.daysOverdue })) + '</span>',
				alert: {
					type: 'warning',
					message: t('pages.reports.overdueAlert', { cadence: row.cadence })
				},
				metaRows: [
					{ label: t('pages.reports.daysOverdue'), value: row.daysOverdue },
					{ label: t('pages.reports.cadence'), value: row.cadence },
					{ label: t('pages.reports.riskLevel'), value: RM.I18n.riskLabel(row.riskLevel) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{
						label: t('pages.reports.caseManager'),
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: [{
					title: t('pages.reports.lastFollowUp'),
					body: latestNote
						? '<div class="note-entry drawer-note">' +
							'<div class="note-meta">' + RM.Components.formatDate(latestNote.date) + ' · ' +
							RM.Components.escapeHtml(latestNote.type) + '</div>' +
							'<p>' + RM.Components.escapeHtml(latestNote.text) + '</p></div>'
						: '<p>' + RM.Components.escapeHtml(t('pages.reports.noNotesYet')) + '</p>'
				}]
			},
			table,
			'.overdue-row'
		);
	}

	function renderEnrollmentTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.dateEnrolled')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.event')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="enrollment-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.enrollmentRowAria', { name: row.clientName, event: row.eventName })) + '">' +
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
			t('pages.reports.enrollmentDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				alert: {
					type: 'info',
					message: t('pages.reports.enrolledMessage', {
						event: row.eventName,
						date: RM.Components.formatDate(row.dateEnrolled)
					})
				},
				metaRows: [
					{ label: t('pages.reports.programEventLabel'), value: row.eventName },
					{ label: t('pages.reports.dateEnrolledLabel'), value: RM.Components.formatDate(row.dateEnrolled) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{ label: t('components.address'), value: client.address }
				],
				sections: otherEnrollments.length ? [{
					title: t('pages.reports.otherEnrollments'),
					body: '<ul class="drawer-list">' + otherEnrollments.map(function (e) {
						return '<li>' + RM.Components.escapeHtml(RM.ReportEngine.eventName(e.serviceOrEventId)) +
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
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.cbo')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.status')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.date')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row, idx) {
				return '<tr class="cbo-row" data-row-index="' + idx + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.cboRowAria', { name: row.clientName, cbo: row.cboName })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.cboName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', row.status)) + '</td>' +
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
			t('pages.reports.cboDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				hideStatusBadge: true,
				badgeHtml: '<span class="client-status-badge">' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', row.status)) + '</span>',
				alert: {
					type: 'info',
					message: t('pages.reports.cboAlert', { cbo: row.cboName })
				},
				metaRows: [
					{ label: t('pages.reports.cboOrganization'), value: row.cboName },
					{ label: t('pages.reports.referralStatus'), value: RM.I18n.enumLabel('cboStatus', row.status) },
					{ label: t('pages.reports.dateReferred'), value: RM.Components.formatDate(row.date) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{
						label: t('pages.reports.caseManager'),
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: otherCbos.length ? [{
					title: t('pages.reports.otherOpenCbos'),
					body: '<ul class="drawer-list">' + otherCbos.map(function (r) {
						return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' +
							RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', r.status)) + ' (' + RM.Components.formatDate(r.date) + ')</li>';
					}).join('') + '</ul>'
				}] : []
			},
			table,
			'.cbo-row'
		);
	}
})();
