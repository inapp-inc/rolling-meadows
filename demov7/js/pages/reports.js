/* global RM */
(function () {
	'use strict';

	function mergeDownloadHandlers(base, extra) {
		extra = extra || {};
		return {
			images: Object.assign({}, base.images || {}, extra.images || {}),
			csv: Object.assign({}, base.csv || {}, extra.csv || {})
		};
	}

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

	function programColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'program', label: t('pages.reports.program') },
			{ key: 'openCases', label: t('pages.reports.openCases') },
			{ key: 'registeredAt', label: t('pages.reports.registeredAt') }
		];
	}

	function reportCardTitle(titleText, catalogId) {
		if (catalogId && RM.ReportCatalog) {
			return '<a href="' + RM.Components.escapeHtml(RM.ReportCatalog.builderUrl(catalogId)) +
				'" class="report-card-title-link" title="' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
				RM.Components.escapeHtml(titleText) + '</a>';
		}
		return RM.Components.escapeHtml(titleText);
	}

	function programReportCard(chartId, csvId, catalogId) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t('pages.reports.clientsByProgram'), catalogId) + '</h2>' +
			reportCardActions(catalogId, RM.Components.downloadBar({ imageTarget: chartId, csvId: csvId })) +
			'</div><p class="text-muted report-card-lead">' + RM.Components.escapeHtml(t('pages.reports.clientsByProgramHint')) + '</p>' +
			'<div id="' + chartId + '" class="risk-chart program-chart"></div></div>';
	}

	function renderProgramDistributionChart(containerId, rows, groups) {
		var el = document.getElementById(containerId);
		if (!el) { return; }
		if (!rows.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.reports.noProgramData'), t('pages.reports.noProgramDataHint'));
			return;
		}
		var total = rows.reduce(function (sum, row) { return sum + row.count; }, 0);
		el.innerHTML = rows.map(function (row) {
			var pct = total ? Math.round((row.count / total) * 100) : 0;
			var fillWidth = row.count > 0 ? Math.max(pct, 1) : 0;
			return '<div class="risk-chart-row program-chart-row" data-program-id="' + RM.Components.escapeHtml(row.programId) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t('pages.reports.programDrilldownAria', { count: row.count, program: row.programLabel })) + '">' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(row.programLabel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + fillWidth + '%;background:' +
				RM.Components.escapeHtml(row.color) + '"></div></div>' +
				'<div class="risk-chart-count">' + row.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.program-chart-row').forEach(function (row) {
			function activate() {
				var programId = row.getAttribute('data-program-id');
				var programRow = rows.find(function (item) { return item.programId === programId; });
				openProgramDrawer(programRow, groups[programId] || [], el);
				el.querySelectorAll('.program-chart-row').forEach(function (item) { item.classList.remove('active'); });
				row.classList.add('active');
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function openProgramDrawer(programRow, clients, chartEl) {
		if (!programRow) { return; }
		var title = clients.length === 1
			? t('pages.reports.programDrawerTitle', { program: programRow.programLabel, count: clients.length })
			: t('pages.reports.programDrawerTitlePlural', { program: programRow.programLabel, count: clients.length });
		var table = chartEl;
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.program-chart-row').forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function multiProgramColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'programCount', label: t('pages.reports.programCount') },
			{ key: 'programs', label: t('pages.reports.programs') },
			{ key: 'openCases', label: t('pages.reports.openCases') }
		];
	}

	function multiProgramReportCard(prefix, catalogId) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t('pages.reports.multiProgramEnrollment'), catalogId) + '</h2>' +
			reportCardActions(catalogId, RM.Components.downloadBar({
				imageTarget: prefix + '-multi-program-chart',
				csvId: prefix + '-multi-program'
			})) +
			'</div><p class="text-muted report-card-lead">' + RM.Components.escapeHtml(t('pages.reports.multiProgramEnrollmentHint')) + '</p>' +
			'<p id="' + prefix + '-multi-program-summary" class="liaison-results-summary"></p>' +
			'<div id="' + prefix + '-multi-program-chart" class="risk-chart program-chart"></div>' +
			'<div id="' + prefix + '-multi-program-table"></div></div>';
	}

	function reportCardActions(catalogId, downloadBarHtml) {
		var editBtn = catalogId && RM.ReportCatalog
			? '<a href="' + RM.Components.escapeHtml(RM.ReportCatalog.builderUrl(catalogId)) +
				'" class="btn btn-secondary btn-sm report-edit-btn" title="' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilder')) + '</a>'
			: '';
		return '<div class="report-card-actions">' + editBtn + (downloadBarHtml || '') + '</div>';
	}

	function editableReportCard(titleKey, catalogId, bodyHtml, downloadBarHtml) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t(titleKey), catalogId) + '</h2>' +
			reportCardActions(catalogId, downloadBarHtml) +
			'</div>' + bodyHtml + '</div>';
	}

	function renderMultiProgramSummary(summaryId, count) {
		var el = document.getElementById(summaryId);
		if (!el) { return; }
		el.innerHTML = count === 1
			? t('pages.reports.multiProgramSummary', { count: count })
			: t('pages.reports.multiProgramSummaryPlural', { count: count });
	}

	function renderBucketDistributionChart(containerId, rows, getClientsForBucket, ariaKey, options) {
		options = options || {};
		var el = document.getElementById(containerId);
		if (!el) { return; }
		var total = rows.reduce(function (sum, row) { return sum + row.count; }, 0);
		el.innerHTML = rows.map(function (row) {
			var pct = total ? Math.round((row.count / total) * 100) : 0;
			var fillWidth = row.count > 0 ? Math.max(pct, 1) : 0;
			return '<div class="risk-chart-row program-chart-row" data-bucket-id="' + RM.Components.escapeHtml(row.bucketId) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t(ariaKey, { count: row.count, program: row.programLabel })) + '">' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(row.programLabel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + fillWidth + '%;background:' +
				RM.Components.escapeHtml(row.color) + '"></div></div>' +
				'<div class="risk-chart-count">' + row.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.program-chart-row').forEach(function (row) {
			function activate() {
				var bucketId = row.getAttribute('data-bucket-id');
				var bucketRow = rows.find(function (item) { return item.bucketId === bucketId; });
				if (options.onBucketSelect) {
					options.onBucketSelect(bucketId, bucketRow, row, el);
					return;
				}
				openProgramDrawer(bucketRow, getClientsForBucket(bucketId), el);
				el.querySelectorAll('.program-chart-row').forEach(function (item) { item.classList.remove('active'); });
				row.classList.add('active');
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function multiProgramTableTitleKey(bucketId) {
		if (bucketId === '1') { return 'pages.reports.singleProgramClientListTitle'; }
		if (bucketId === '2') { return 'pages.reports.twoProgramClientListTitle'; }
		if (bucketId === '3plus') { return 'pages.reports.threePlusProgramClientListTitle'; }
		return 'pages.reports.multiProgramClientListTitle';
	}

	function updateMultiProgramTable(prefix, caseManagerId, bucketId) {
		var rows = RM.ReportEngine.clientProgramDetailForBucket(caseManagerId, bucketId || 'multi');
		var tableContainerId = prefix + '-multi-program-table';
		document.getElementById(tableContainerId).innerHTML = renderMultiProgramTable(rows, multiProgramTableTitleKey(bucketId));
		wireMultiProgramDrilldown(rows, tableContainerId);
	}

	function renderMultiProgramTable(rows, titleKey) {
		titleKey = titleKey || 'pages.reports.multiProgramClientListTitle';
		if (!rows.length) {
			return RM.Components.emptyState(t('pages.reports.noClientsInBucket'), t('pages.reports.noClientsInBucketHint'));
		}
		return '<h3 class="form-section-title" style="font-size:0.9375rem;margin:1rem 0 0.75rem">' +
			RM.Components.escapeHtml(t(titleKey)) + '</h3>' +
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.programCount')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.programs')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.openCases')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="multi-program-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.multiProgramRowAria', { name: row.clientName, count: row.programCount })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td><strong>' + RM.Components.escapeHtml(row.programCount) + '</strong></td>' +
					'<td>' + RM.Components.escapeHtml(row.programs) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.openCases) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireMultiProgramDrilldown(rows, tableContainerId) {
		var table = document.querySelector('#' + tableContainerId + ' .data-table-interactive');
		if (!table) { return; }
		var byClientId = {};
		rows.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.multi-program-row', function (row) {
			openMultiProgramDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openMultiProgramDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }
		RM.Components.openClientCasesDrawer(client, table, '.multi-program-row');
	}

	function mountMultiProgramReport(prefix, caseManagerId) {
		var distribution = RM.ReportEngine.multiProgramDistribution(caseManagerId);
		var multiCount = RM.ReportEngine.multiProgramEnrollmentCount(caseManagerId);
		var distributionTotal = distribution.reduce(function (sum, row) { return sum + row.count; }, 0);
		var activeBucketId = null;

		renderMultiProgramSummary(prefix + '-multi-program-summary', multiCount);
		renderBucketDistributionChart(
			prefix + '-multi-program-chart',
			distribution,
			null,
			'pages.reports.multiProgramBucketAria',
			{
				onBucketSelect: function (bucketId, bucketRow, chartRow, chartEl) {
					if (activeBucketId === bucketId) {
						activeBucketId = null;
						chartEl.querySelectorAll('.program-chart-row').forEach(function (item) {
							item.classList.remove('active');
						});
						updateMultiProgramTable(prefix, caseManagerId, null);
						return;
					}
					activeBucketId = bucketId;
					chartEl.querySelectorAll('.program-chart-row').forEach(function (item) {
						item.classList.toggle('active', item === chartRow);
					});
					updateMultiProgramTable(prefix, caseManagerId, bucketId);
				}
			}
		);
		updateMultiProgramTable(prefix, caseManagerId, null);

		return {
			distribution: distribution,
			distributionTotal: distributionTotal,
			detail: RM.ReportEngine.multiProgramEnrollmentDetail(caseManagerId)
		};
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
		var programData = RM.ReportEngine.clientsByProgram(null);
		var programGroups = RM.ReportEngine.clientsByProgramGroups(null);
		var programTotal = programData.reduce(function (sum, row) { return sum + row.count; }, 0);

		main.innerHTML =
			RM.Components.modulePageHeader('audit-reports') +
			(RM.ReportSections ? RM.ReportSections.buildExtendedHtml('auditor') : '') +
			'<div class="card-grid">' +
			RM.Components.statCard(snapshot.totalActive, t('pages.reports.activeCaseload'), 'users', 'primary', null) +
			RM.Components.statCard(snapshot.highRisk, t('pages.reports.highRisk'), 'chart', 'warning', null) +
			RM.Components.statCard(snapshot.overdueFollowUps, t('pages.reports.overdueFollowUpsStat'), 'clock', 'accent', null) +
			RM.Components.statCard(snapshot.openCboReferrals, t('pages.reports.openCboStat'), 'link', 'success', null) +
			'</div>' +
			programReportCard('auditor-report-program', 'auditor-report-program', 'clients-by-program') +
			multiProgramReportCard('auditor', 'multi-program-enrollment') +
			editableReportCard('pages.reports.caseloadByRisk', 'caseload-by-risk',
				'<div id="auditor-report-risk"></div>',
				RM.Components.downloadBar({ imageTarget: 'auditor-report-risk', csvId: 'auditor-report-risk' })) +
			editableReportCard('pages.reports.enrollmentsByProgram', 'event-enrollment',
				'<div class="form-group"><label for="auditor-report-event">' + RM.Components.escapeHtml(t('pages.reports.programEvent')) + '</label>' +
				'<select id="auditor-report-event">' + events.map(function (e) {
					return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
				}).join('') + '</select></div>' +
				'<div id="auditor-report-event-data"></div>',
				RM.Components.downloadBar({ csvId: 'auditor-report-event' })) +
			editableReportCard('pages.reports.overdueSummary', 'overdue-follow-ups',
				'<div id="auditor-report-overdue"></div>',
				RM.Components.downloadBar({ imageTarget: 'auditor-report-overdue', csvId: 'auditor-report-overdue' })) +
			editableReportCard('pages.reports.cboSummary', 'open-cbo-referrals',
				'<div id="auditor-report-cbo"></div>',
				RM.Components.downloadBar({ imageTarget: 'auditor-report-cbo', csvId: 'auditor-report-cbo' }));

		document.getElementById('auditor-report-risk').innerHTML = renderRiskTable(riskData);
		wireRiskDrilldown(RM.ReportEngine.clientsGroupedByRisk(null), 'auditor-report-risk');
		renderProgramDistributionChart('auditor-report-program', programData, programGroups);
		var auditorMultiProgram = mountMultiProgramReport('auditor', null);
		var auditorExtendedData = RM.ReportSections ? RM.ReportSections.mount('auditor', null) : null;

		function refreshAuditorEnrollment() {
			var eventId = document.getElementById('auditor-report-event').value;
			var eventData = RM.ReportEngine.enrolledInEvent(eventId);
			document.getElementById('auditor-report-event-data').innerHTML = eventData.length
				? renderEnrollmentTable(eventData)
				: RM.Components.emptyState(t('pages.reports.noEnrollments'), t('pages.reports.noEnrollmentsAuditor'));
			wireEnrollmentDrilldown(eventData, 'auditor-report-event-data');
		}

		document.getElementById('auditor-report-event').addEventListener('change', refreshAuditorEnrollment);
		refreshAuditorEnrollment();

		document.getElementById('auditor-report-overdue').innerHTML = renderAuditorOverdueSummary(overdueSummary);
		wireAuditorOverdueDrilldown(overdueSummary);
		document.getElementById('auditor-report-cbo').innerHTML = renderAuditorCboSummary(cboSummary);
		wireAuditorCboDrilldown(cboSummary);

		RM.Components.wireDownloadActions(main, mergeDownloadHandlers({
			images: {
				'auditor-report-program': function () {
					RM.Components.exportProgramDistributionBarChartPng(
						programData,
						programTotal,
						t('pages.reports.clientsByProgram'),
						'audit-people-by-program.png'
					);
				},
				'auditor-multi-program-chart': function () {
					RM.Components.exportProgramDistributionBarChartPng(
						auditorMultiProgram.distribution,
						auditorMultiProgram.distributionTotal,
						t('pages.reports.multiProgramEnrollment'),
						'audit-multi-program-enrollment.png'
					);
				},
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
				'auditor-report-program': function () {
					RM.Components.exportXlsx(
						'audit-people-by-program-detail.xlsx',
						RM.ReportEngine.clientsByProgramDetail(null),
						programColumns(),
						{ title: t('pages.reports.auditProgramDetail'), sheetName: t('pages.reports.sheetProgram') }
					);
				},
				'auditor-multi-program': function () {
					RM.Components.exportXlsx(
						'audit-multi-program-enrollment-detail.xlsx',
						RM.ReportEngine.multiProgramEnrollmentDetail(null),
						multiProgramColumns(),
						{ title: t('pages.reports.auditMultiProgramDetail'), sheetName: t('pages.reports.sheetMultiProgram') }
					);
				},
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
		}, RM.ReportSections ? RM.ReportSections.getDownloadHandlers('auditor', null, auditorExtendedData) : null));
	}

	function renderAuditorOverdueSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState(t('pages.reports.noOverdue'), t('pages.reports.noOverdueHint'));
		}
		var riskEntries = summaryCountRows(summary.byRisk, function (level) { return RM.I18n.riskLabel(level); });
		var cadenceEntries = summaryCountRows(summary.byCadence, function (cadence) { return cadence; });
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> ' +
			(summary.total === 1
				? t('pages.reports.overdueProgramWide', { count: summary.total })
				: t('pages.reports.overdueProgramWidePlural', { count: summary.total })) + '</p>' +
			'<div class="auditor-summary-grid">' +
			'<div>' + renderInteractiveSummaryTable('pages.reports.byRiskLevel', riskEntries, 'pages.reports.summaryDrilldownAria', function (level) {
				return RM.I18n.riskLabel(level);
			}) + '</div>' +
			'<div>' + renderInteractiveSummaryTable('pages.reports.byCadence', cadenceEntries, 'pages.reports.summaryDrilldownAria', function (cadence) {
				return cadence;
			}) + '</div></div>';
	}

	function wireAuditorOverdueDrilldown(summary) {
		var container = document.getElementById('auditor-report-overdue');
		if (!container || !summary.total) { return; }
		var tables = container.querySelectorAll('.report-summary-drilldown');
		if (tables[0]) {
			wireSummaryDrilldown(tables[0], function (value, row, tableEl) {
				var rows = RM.ReportEngine.overdueFollowUpsFiltered('risk', value, null);
				openOverdueListDrawer(
					t('pages.reports.overdueSummaryDrawerTitle', { label: RM.I18n.riskLabel(value), count: rows.length }),
					rows,
					tableEl,
					'.report-summary-row'
				);
			});
		}
		if (tables[1]) {
			wireSummaryDrilldown(tables[1], function (value, row, tableEl) {
				var rows = RM.ReportEngine.overdueFollowUpsFiltered('cadence', value, null);
				openOverdueListDrawer(
					t('pages.reports.overdueSummaryDrawerTitle', { label: value, count: rows.length }),
					rows,
					tableEl,
					'.report-summary-row'
				);
			});
		}
	}

	function renderAuditorCboSummary(summary) {
		if (!summary.total) {
			return RM.Components.emptyState(t('pages.reports.noOpenCbo'), t('pages.reports.noOpenCboHint'));
		}
		var statusEntries = summaryCountRows(summary.byStatus, function (status) {
			return RM.I18n.enumLabel('cboStatus', status);
		});
		var cboEntries = summaryCountRows(summary.byCbo, function (cbo) { return cbo; });
		return '<p class="liaison-results-summary"><strong>' + summary.total + '</strong> ' +
			(summary.total === 1
				? t('pages.reports.openReferralsPending', { count: summary.total })
				: t('pages.reports.openReferralsPendingPlural', { count: summary.total })) + '</p>' +
			'<div class="auditor-summary-grid">' +
			'<div>' + renderInteractiveSummaryTable('pages.reports.byStatus', statusEntries, 'pages.reports.summaryDrilldownAria', function (status) {
				return RM.I18n.enumLabel('cboStatus', status);
			}) + '</div>' +
			'<div>' + renderInteractiveSummaryTable('pages.reports.byOrganization', cboEntries, 'pages.reports.summaryDrilldownAria', function (cbo) {
				return cbo;
			}) + '</div></div>';
	}

	function wireAuditorCboDrilldown(summary) {
		var container = document.getElementById('auditor-report-cbo');
		if (!container || !summary.total) { return; }
		var tables = container.querySelectorAll('.report-summary-drilldown');
		if (tables[0]) {
			wireSummaryDrilldown(tables[0], function (value, row, tableEl) {
				var rows = RM.ReportEngine.openCBOReferralsFiltered('status', value);
				openCboListDrawer(
					t('pages.reports.cboSummaryDrawerTitle', { label: RM.I18n.enumLabel('cboStatus', value), count: rows.length }),
					rows,
					tableEl,
					'.report-summary-row'
				);
			});
		}
		if (tables[1]) {
			wireSummaryDrilldown(tables[1], function (value, row, tableEl) {
				var rows = RM.ReportEngine.openCBOReferralsFiltered('cbo', value);
				openCboListDrawer(
					t('pages.reports.cboSummaryDrawerTitle', { label: value, count: rows.length }),
					rows,
					tableEl,
					'.report-summary-row'
				);
			});
		}
	}

	function renderPage() {
		RM.Components.closeSideDrawer();

		var main = document.getElementById('page-content');
		var user = RM.Session.getCurrentUser();
		var events = RM.ReportEngine.localizedEvents();
		var riskGroups = RM.Data.groupByRisk(RM.Data.activeClients());
		var programManagerId = user.role === 'case_manager' ? user.id : null;
		var programData = RM.ReportEngine.clientsByProgram(programManagerId);
		var programGroups = RM.ReportEngine.clientsByProgramGroups(programManagerId);
		var programTotal = programData.reduce(function (sum, row) { return sum + row.count; }, 0);

		main.innerHTML =
			RM.Components.modulePageHeader('reports') +
			(RM.ReportSections ? RM.ReportSections.buildExtendedHtml('report') : '') +
			programReportCard('report-program', 'report-program', 'clients-by-program') +
			multiProgramReportCard('report', 'multi-program-enrollment') +
			editableReportCard('pages.reports.caseloadByRisk', 'caseload-by-risk',
				'<div id="report-risk"></div>',
				RM.Components.downloadBar({ imageTarget: 'report-risk', csvId: 'report-risk' })) +
			editableReportCard('pages.reports.clientsEnrolledInEvent', 'event-enrollment',
				'<div class="form-group"><label for="report-event">' + RM.Components.escapeHtml(t('pages.reports.eventForReport')) + '</label>' +
				'<select id="report-event">' + events.map(function (e) {
					return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
				}).join('') + '</select></div>' +
				'<div id="report-event-data"></div>',
				RM.Components.downloadBar({ imageTarget: 'report-event-data', csvId: 'report-event' })) +
			editableReportCard('pages.reports.overdueFollowUps', 'overdue-follow-ups',
				'<div id="report-overdue"></div>',
				RM.Components.downloadBar({ imageTarget: 'report-overdue', csvId: 'report-overdue' })) +
			editableReportCard('pages.reports.openCboReferrals', 'open-cbo-referrals',
				'<div id="report-cbo"></div>',
				RM.Components.downloadBar({ imageTarget: 'report-cbo', csvId: 'report-cbo' }));

		var riskData = RM.ReportEngine.caseloadByRisk();
		renderProgramDistributionChart('report-program', programData, programGroups);
		var reportMultiProgram = mountMultiProgramReport('report', programManagerId);
		var reportExtendedData = RM.ReportSections ? RM.ReportSections.mount('report', programManagerId) : null;
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

		RM.Components.wireDownloadActions(main, mergeDownloadHandlers({
			images: {
				'report-program': function () {
					RM.Components.exportProgramDistributionBarChartPng(
						programData,
						programTotal,
						t('pages.reports.clientsByProgram'),
						'people-by-program.png'
					);
				},
				'report-multi-program-chart': function () {
					RM.Components.exportProgramDistributionBarChartPng(
						reportMultiProgram.distribution,
						reportMultiProgram.distributionTotal,
						t('pages.reports.multiProgramEnrollment'),
						'multi-program-enrollment.png'
					);
				},
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
				'report-program': function () {
					RM.Components.exportXlsx(
						'people-by-program-detail.xlsx',
						RM.ReportEngine.clientsByProgramDetail(programManagerId),
						programColumns(),
						{ title: t('pages.reports.programDetail'), sheetName: t('pages.reports.sheetProgram') }
					);
				},
				'report-multi-program': function () {
					RM.Components.exportXlsx(
						'multi-program-enrollment-detail.xlsx',
						RM.ReportEngine.multiProgramEnrollmentDetail(programManagerId),
						multiProgramColumns(),
						{ title: t('pages.reports.multiProgramDetail'), sheetName: t('pages.reports.sheetMultiProgram') }
					);
				},
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
		}, RM.ReportSections ? RM.ReportSections.getDownloadHandlers('report', programManagerId, reportExtendedData) : null));
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

	function wireRiskDrilldown(riskGroups, containerId) {
		containerId = containerId || 'report-risk';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.risk-row', function (row) {
			var level = row.getAttribute('data-risk');
			openRiskDrawer(level, riskGroups[level] || [], containerId);
		});
	}

	function openRiskDrawer(level, clients, containerId) {
		containerId = containerId || 'report-risk';
		var levelLabel = RM.I18n.riskLabel(level);
		var title = clients.length === 1
			? t('pages.reports.riskDrawerTitle', { level: levelLabel, count: clients.length })
			: t('pages.reports.riskDrawerTitlePlural', { level: levelLabel, count: clients.length });
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.risk-row').forEach(function (r) { r.classList.remove('active'); });
			}
		});
	}

	function summaryCountRows(map, labelFormatter) {
		return Object.keys(map).map(function (key) {
			return { value: key, count: map[key], label: labelFormatter(key) };
		});
	}

	function renderInteractiveSummaryTable(titleKey, entries, ariaKey, labelFormatter) {
		if (!entries.length) { return ''; }
		return '<h3 class="form-section-title" style="font-size:0.9375rem;margin:0 0 0.75rem">' +
			RM.Components.escapeHtml(t(titleKey)) + '</h3>' +
			'<table class="data-table data-table-interactive report-summary-drilldown"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t(titleKey)) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			entries.map(function (entry) {
				var label = labelFormatter(entry.value);
				return '<tr class="report-summary-row" data-summary-value="' + RM.Components.escapeHtml(entry.value) +
					'" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t(ariaKey, { label: label, count: entry.count })) +
					'"><td>' + RM.Components.escapeHtml(label) + '</td><td><strong>' + entry.count + '</strong></td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireSummaryDrilldown(containerEl, onSelect) {
		if (!containerEl) { return; }
		RM.Components.wireInteractiveTable(containerEl, '.report-summary-row', function (row) {
			onSelect(row.getAttribute('data-summary-value'), row, containerEl);
		});
	}

	function openOverdueListDrawer(title, overdueRows, tableEl, rowSelector) {
		var clients = overdueRows.map(function (row) {
			return RM.ClientRepository.findById(row.clientId);
		}).filter(function (client) { return !!client; });
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (tableEl && rowSelector) {
				tableEl.querySelectorAll(rowSelector).forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function openCboListDrawer(title, cboRows, tableEl, rowSelector) {
		var clients = cboRows.map(function (row) {
			return RM.ClientRepository.findById(row.clientId);
		}).filter(function (client) { return !!client; });
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (tableEl && rowSelector) {
				tableEl.querySelectorAll(rowSelector).forEach(function (row) { row.classList.remove('active'); });
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

	function wireEnrollmentDrilldown(enrollmentData, containerId) {
		containerId = containerId || 'report-event-data';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
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
