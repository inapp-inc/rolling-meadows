/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: null,
			activeNav: 'dashboard',
			onReady: function () {
				var user = RM.Session.getCurrentUser();
				var main = document.getElementById('page-content');

				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}

				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}

				var caseload = RM.Data.caseloadForUser(user);

				var overdue = RM.FollowUpCadenceService.getDueFollowUps(
					user.role === 'case_manager' ? user.id : null
				);
				var incomplete = caseload.filter(function (c) { return c.incompleteIntake; });
				var overdueByClientId = {};
				overdue.forEach(function (d) {
					overdueByClientId[d.client.id] = d;
				});
				var riskGroups = RM.Data.groupByRisk(caseload);
				var riskReport = buildRiskReport(riskGroups);
				var total = caseload.length;
				var highCount = (riskGroups.High || []).length;
				var success = RM.ReportEngine.caseloadSuccessMetrics(caseload, overdue.length);

				main.innerHTML =
					RM.Components.pageHeader('At a Glance') +
					renderSuccessBanner(success) +
					'<div class="card-grid dashboard-stat-grid">' +
					RM.Components.statCard(success.serviceEnrollments, 'Services Connected', 'link', 'success', null) +
					RM.Components.statCard(success.activeGoals, 'Care Goals Active', 'clipboard', 'success', null) +
					RM.Components.statCard(success.riskImprovements, 'Risk Improvements', 'trendUp', 'success', null) +
					RM.Components.statCard(caseload.length, 'Active Caseload', 'users', 'primary', null) +
					RM.Components.statCard(overdue.length, 'Overdue Follow-ups', 'clock', 'warning', null) +
					RM.Components.statCard(incomplete.length, 'Incomplete Intakes', 'clipboard', 'accent', null) +
					'</div>' +
					'<div class="dashboard-stack">' +
					'<div class="card">' +
					'<div class="card-header"><h2>Program Overview</h2></div>' +
					'<div class="snapshot-bar snapshot-bar-success">' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.intakeCompletePct + '%</span><span class="snap-label">Intakes complete</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.followUpOnTrackPct + '%</span><span class="snap-label">Follow-ups on track</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.clientsWithServices + '</span><span class="snap-label">Receiving services</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.cboConfirmed + '</span><span class="snap-label">CBO partners confirmed</span></div>' +
					'</div>' +
					'<div class="snapshot-bar">' +
					'<div class="snapshot-item"><span class="snap-value">' + total + '</span><span class="snap-label">Total active</span></div>' +
					'<div class="snapshot-item snap-alert"><span class="snap-value">' + highCount + '</span><span class="snap-label">High risk</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + overdue.length + '</span><span class="snap-label">Need follow-up</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + incomplete.length + '</span><span class="snap-label">Incomplete intake</span></div>' +
					'</div>' +
					'<h3 class="dashboard-subheading">Caseload by risk level</h3>' +
					'<div class="risk-chart" id="risk-chart"></div>' +
					'</div>' +
					'<div class="card">' +
					'<div class="card-header"><h2>Risk Mix</h2></div>' +
					'<div id="donut-chart"></div></div>' +
					'<div class="card" id="caseload-section">' +
					'<div class="card-header caseload-card-header">' +
					'<h2>Full Caseload</h2>' +
					'<a href="' + RM.Links.page('client-search') + '" class="btn btn-sm btn-secondary">Search all</a></div>' +
					'<div class="caseload-filter-bar" role="toolbar" aria-label="Filter caseload">' +
					'<button type="button" class="caseload-filter-btn is-active" data-filter="all" aria-pressed="true">All (' + caseload.length + ')</button>' +
					'<button type="button" class="caseload-filter-btn" data-filter="overdue" aria-pressed="false"' +
					(overdue.length ? '' : ' disabled') + '>Overdue follow-ups (' + overdue.length + ')</button>' +
					'<button type="button" class="caseload-filter-btn" data-filter="incomplete" aria-pressed="false"' +
					(incomplete.length ? '' : ' disabled') + '>Incomplete intakes (' + incomplete.length + ')</button>' +
					'</div>' +
					'<div id="caseload-table"></div></div>' +
					'</div>';

				renderRiskChart(riskReport, riskGroups, total);
				renderDonut(riskReport, total, riskGroups);
				wireCaseloadFilters(caseload, overdueByClientId);
				setCaseloadFilter('all');
				wireStatScroll(main);
			}
		});
	});

	var RISK_ORDER = ['High', 'Medium', 'Moderate', 'Low', 'Unknown'];
	var RISK_CLASS = {
		High: 'risk-high',
		Medium: 'risk-medium',
		Moderate: 'risk-moderate',
		Low: 'risk-low',
		Unknown: 'risk-unknown'
	};

	function wireStatScroll(main) {
		var cards = main.querySelectorAll('.stat-card');
		var filters = [null, null, null, 'all', 'overdue', 'incomplete'];
		cards.forEach(function (card, i) {
			var filter = filters[i];
			if (!filter) { return; }
			card.style.cursor = 'pointer';
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', 'Show ' + (card.querySelector('.stat-label') || {}).textContent + ' in caseload table');
			function activate() {
				setCaseloadFilter(filter);
				document.getElementById('caseload-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			card.addEventListener('click', activate);
			card.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			});
		});
	}

	var caseloadState = {
		clients: [],
		overdueByClientId: {},
		activeFilter: 'all'
	};

	function setCaseloadFilter(filter) {
		caseloadState.activeFilter = filter;
		document.querySelectorAll('.caseload-filter-btn').forEach(function (btn) {
			var isActive = btn.getAttribute('data-filter') === filter;
			btn.classList.toggle('is-active', isActive);
			btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});
		renderCaseload(filter);
	}

	function wireCaseloadFilters(caseload, overdueByClientId) {
		caseloadState.clients = caseload;
		caseloadState.overdueByClientId = overdueByClientId;
		document.querySelectorAll('.caseload-filter-btn').forEach(function (btn) {
			btn.addEventListener('click', function () {
				if (btn.disabled) { return; }
				setCaseloadFilter(btn.getAttribute('data-filter'));
			});
		});
	}

	function filterCaseloadClients(filter) {
		if (filter === 'overdue') {
			return caseloadState.clients.filter(function (c) {
				return caseloadState.overdueByClientId[c.id];
			});
		}
		if (filter === 'incomplete') {
			return caseloadState.clients.filter(function (c) { return c.incompleteIntake; });
		}
		return caseloadState.clients;
	}

	function caseloadAttentionCell(client, filter) {
		var overdue = caseloadState.overdueByClientId[client.id];
		if (filter === 'overdue' && overdue) {
			return RM.Components.escapeHtml(overdue.daysOverdue + ' days overdue · ' + overdue.cadence);
		}
		if (filter === 'incomplete' && client.incompleteIntake) {
			return '<span class="incomplete-badge">Incomplete intake</span>';
		}
		return '—';
	}

	function buildRiskReport(groups) {
		return RISK_ORDER.map(function (level) {
			return { riskLevel: level, count: (groups[level] || []).length };
		}).filter(function (r) { return r.count > 0; });
	}

	function renderSuccessBanner(metrics) {
		var progressRows = [
			{ label: 'Intakes complete', pct: metrics.intakeCompletePct },
			{ label: 'Follow-ups on track', pct: metrics.followUpOnTrackPct },
			{ label: 'Clients receiving services', pct: metrics.servicesConnectedPct }
		];

		return '<section class="card dashboard-success-card" aria-label="Program impact summary">' +
			'<div class="dashboard-success-layout">' +
			'<div class="success-ring-wrap" aria-hidden="true">' +
			'<div class="success-ring" style="--success-pct:' + metrics.intakeCompletePct + '">' +
			'<div class="success-ring-inner">' +
			'<span class="success-ring-value">' + metrics.intakeCompletePct + '%</span>' +
			'<span class="success-ring-label">Intakes complete</span></div></div></div>' +
			'<div class="dashboard-success-copy">' +
			'<p class="dashboard-success-eyebrow">Program impact</p>' +
			'<h2 class="dashboard-success-title">Strong outcomes across the caseload</h2>' +
			'<p class="dashboard-success-lead">Clients are connected to services, care plans are active, and documented reassessments show measurable risk improvement.</p>' +
			'<ul class="dashboard-success-highlights">' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			metrics.serviceEnrollments + ' active service enrollments</li>' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			metrics.activeGoals + ' care plan goals in progress</li>' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			metrics.riskImprovements + ' documented risk improvement' + (metrics.riskImprovements === 1 ? '' : 's') + '</li>' +
			'</ul></div></div>' +
			'<div class="success-progress-list">' +
			progressRows.map(function (row) {
				return '<div class="success-progress-row">' +
					'<span class="success-progress-label">' + RM.Components.escapeHtml(row.label) + '</span>' +
					'<div class="success-progress-track" role="presentation">' +
					'<div class="success-progress-fill" style="width:' + row.pct + '%"></div></div>' +
					'<span class="success-progress-value">' + row.pct + '%</span></div>';
			}).join('') +
			'</div></section>';
	}

	function renderRiskChart(report, groups, total) {
		var el = document.getElementById('risk-chart');
		if (!report.length) {
			el.innerHTML = RM.Components.emptyState('No risk data', 'Complete assessments to populate this view.');
			return;
		}
		el.innerHTML = report.map(function (r) {
			var pct = total ? Math.round((r.count / total) * 100) : 0;
			var cls = RISK_CLASS[r.riskLevel] || 'risk-unknown';
			return '<div class="risk-chart-row" data-risk="' + RM.Components.escapeHtml(r.riskLevel) + '" role="button" tabindex="0" aria-label="' +
				r.count + ' clients at ' + r.riskLevel + ' risk, click to view">' +
				'<div class="risk-chart-label">' + RM.Components.riskBadge(r.riskLevel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
				'<div class="risk-chart-count">' + r.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.risk-chart-row').forEach(function (row) {
			function activate() {
				showDrilldown(row.getAttribute('data-risk'), groups);
				el.querySelectorAll('.risk-chart-row').forEach(function (r) { r.classList.remove('active'); });
				row.classList.add('active');
				document.querySelectorAll('.donut-legend-item').forEach(function (item) {
					item.classList.toggle('active', item.getAttribute('data-risk') === row.getAttribute('data-risk'));
				});
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function showDrilldown(level, groups) {
		var clients = groups[level] || [];
		var title = level + ' risk — ' + clients.length + ' client' + (clients.length === 1 ? '' : 's');
		var body = !clients.length
			? RM.Components.emptyState('No clients', 'No clients at this risk level.')
			: '<div class="client-chip-list">' + clients.map(function (c) {
				var phone = c.phone || 'No phone';
				return '<div class="client-chip">' +
					'<div><a href="' + RM.Links.page('client-profile', { clientId: c.id }) + '">' +
					RM.Components.escapeHtml(c.name) + '</a>' +
					'<span class="client-chip-meta">' + RM.Components.escapeHtml(phone) +
					' · ' + RM.Components.workflowStageBadge(c) +
					(c.incompleteIntake ? ' · <span class="incomplete-badge">Incomplete intake</span>' : '') +
					'</span></div>' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id }) + '" class="btn btn-sm btn-secondary">Open case</a></div>';
			}).join('') + '</div>';

		RM.Components.openSideDrawer(title, body, clearDrilldownHighlight);
	}

	function clearDrilldownHighlight() {
		document.querySelectorAll('.risk-chart-row').forEach(function (r) { r.classList.remove('active'); });
		document.querySelectorAll('.donut-legend-item').forEach(function (r) { r.classList.remove('active'); });
	}

	function renderDonut(report, total, groups) {
		var el = document.getElementById('donut-chart');
		if (!total) {
			el.innerHTML = RM.Components.emptyState('No data', 'No active clients.');
			return;
		}

		var segments = [];
		var cursor = 0;
		var colors = { High: '#ef4444', Medium: '#f59e0b', Moderate: '#d97706', Low: '#10b981', Unknown: '#94a3b8' };
		report.forEach(function (r) {
			var pct = (r.count / total) * 100;
			segments.push(colors[r.riskLevel] + ' ' + cursor + '% ' + (cursor + pct) + '%');
			cursor += pct;
		});

		el.innerHTML =
			'<div class="donut-wrap donut-wrap-stack">' +
			'<div class="donut-chart" style="background:conic-gradient(' + segments.join(', ') + ')">' +
			'<div class="donut-hole"><span class="donut-total">' + total + '</span><span class="donut-label">Active</span></div></div>' +
			'<div class="donut-legend">' +
			report.map(function (r) {
				return '<div class="donut-legend-item" data-risk="' + RM.Components.escapeHtml(r.riskLevel) + '" role="button" tabindex="0">' +
					'<span class="legend-dot ' + r.riskLevel.toLowerCase() + '"></span>' +
					RM.Components.escapeHtml(r.riskLevel) + ' <strong>(' + r.count + ')</strong></div>';
			}).join('') +
			'</div></div>';

		el.querySelectorAll('.donut-legend-item').forEach(function (item) {
			function activate() {
				var level = item.getAttribute('data-risk');
				showDrilldown(level, groups);
				document.querySelectorAll('.risk-chart-row').forEach(function (r) {
					r.classList.toggle('active', r.getAttribute('data-risk') === level);
				});
				el.querySelectorAll('.donut-legend-item').forEach(function (i) { i.classList.remove('active'); });
				item.classList.add('active');
			}
			item.addEventListener('click', activate);
			item.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function renderCaseload(filter) {
		filter = filter || caseloadState.activeFilter || 'all';
		var el = document.getElementById('caseload-table');
		var clients = filterCaseloadClients(filter);

		if (!clients.length) {
			var emptyTitle = filter === 'overdue'
				? 'No overdue follow-ups'
				: filter === 'incomplete'
					? 'No incomplete intakes'
					: 'No active cases';
			var emptyMessage = filter === 'overdue'
				? 'All follow-ups are current — great work.'
				: filter === 'incomplete'
					? 'Every active intake has consent and date of birth on file.'
					: 'New referrals will appear here.';
			el.innerHTML = RM.Components.emptyState(emptyTitle, emptyMessage);
			return;
		}

		var showAttention = filter !== 'all';
		var rows = clients.map(function (c) {
			var a = RM.RiskAssessmentRepository.findLatest(c.id);
			var attention = caseloadAttentionCell(c, filter);
			return '<tr class="caseload-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0" aria-label="View case summary for ' + RM.Components.escapeHtml(c.name) + '">' +
				'<td>' + RM.Components.escapeHtml(c.name) + '</td>' +
				'<td>' + RM.Components.formatDate(c.dob) + '</td>' +
				'<td>' + RM.Components.workflowStageBadge(c) + '</td>' +
				'<td>' + (a ? RM.Components.riskBadge(a.overallRisk) : '—') + '</td>' +
				(showAttention ? '<td>' + attention + '</td>' : '') +
				'</tr>';
		}).join('');

		var attentionHeader = showAttention
			? '<th>' + (filter === 'overdue' ? 'Follow-up' : 'Intake status') + '</th>'
			: '';

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Name</th><th>DOB</th><th>Process stage</th><th>Risk</th>' + attentionHeader +
			'</tr></thead><tbody>' + rows + '</tbody></table>'
		);

		var table = el.querySelector('.data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.caseload-row', function (row) {
			var client = RM.ClientRepository.findById(row.getAttribute('data-client-id'));
			if (client) {
				RM.Components.openClientDrawer(client.name, client, {}, table, '.caseload-row');
			}
		});
	}
})();
