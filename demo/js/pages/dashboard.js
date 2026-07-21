/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
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
				var riskGroups = RM.Data.groupByRisk(caseload);
				var riskReport = buildRiskReport(riskGroups);
				var total = caseload.length;
				var highCount = (riskGroups.High || []).length;
				var openCboRefs = RM.CBOReferralRepository.findAll().filter(function (r) {
					return r.status === 'Pending' || r.status === 'Sent';
				});
				var openCbo = openCboRefs.length;

				main.innerHTML =
					RM.Components.pageHeader('At a glance', 'Your caseload, alerts, and program overview.') +
					'<div class="card-grid">' +
					RM.Components.statCard(caseload.length, 'Active Caseload', 'users', 'primary', null) +
					RM.Components.statCard(overdue.length, 'Overdue Follow-ups', 'clock', 'warning', null) +
					RM.Components.statCard(incomplete.length, 'Incomplete Intakes', 'clipboard', 'accent', null) +
					RM.Components.statCard(openCbo, 'Open CBO Referrals', 'link', 'success', null) +
					'</div>' +
					'<div class="dashboard-layout">' +
					'<div class="dashboard-main">' +
					'<div class="card">' +
					'<div class="card-header"><h2>Program Overview</h2></div>' +
					'<div class="snapshot-bar">' +
					'<div class="snapshot-item"><span class="snap-value">' + total + '</span><span class="snap-label">Total active</span></div>' +
					'<div class="snapshot-item snap-alert"><span class="snap-value">' + highCount + '</span><span class="snap-label">High risk</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + overdue.length + '</span><span class="snap-label">Need follow-up</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + incomplete.length + '</span><span class="snap-label">Incomplete intake</span></div>' +
					'</div>' +
					'<h3 style="margin:0 0 0.75rem;font-size:0.9375rem;color:var(--color-neutral-600)">Caseload by risk level — click to view clients</h3>' +
					'<div class="risk-chart" id="risk-chart"></div>' +
					'<div class="drilldown-panel hidden" id="risk-drilldown">' +
					'<div class="drilldown-header">' +
					'<h3 id="drilldown-title">Clients</h3>' +
					'<button type="button" class="drilldown-close" id="drilldown-close">Clear filter ×</button>' +
					'</div>' +
					'<div id="drilldown-list"></div>' +
					'</div></div>' +
					'<div class="card" id="caseload-section">' +
					'<div class="card-header"><h2>Full Caseload</h2>' +
					'<a href="' + RM.Links.page('client-search') + '" class="btn btn-sm btn-secondary">Search all</a></div>' +
					'<p class="report-table-hint">Click a row to preview case details.</p>' +
					'<div id="caseload-table"></div></div>' +
					'</div>' +
					'<div class="dashboard-side">' +
					'<div class="sidebar-section">' +
					'<div class="sidebar-section-label">Program insights</div>' +
					'<div class="card">' +
					'<div class="card-header"><h2>Risk Mix</h2></div>' +
					'<div id="donut-chart"></div></div></div>' +
					'<div class="sidebar-section">' +
					'<div class="sidebar-section-label">Needs attention</div>' +
					'<div class="card">' +
					'<div class="card-header"><h2>Overdue Follow-ups</h2>' +
					(overdue.length ? '<a href="' + RM.Links.page('reports') + '" class="btn btn-sm btn-secondary">View all</a>' : '') +
					'</div><div id="overdue-mini"></div></div>' +
					'<div class="card" id="incomplete-section">' +
					'<div class="card-header"><h2>Incomplete Intakes</h2></div><div id="incomplete-mini"></div></div>' +
					'<div class="card" id="cbo-section">' +
					'<div class="card-header"><h2>Open CBO Referrals</h2>' +
					(openCbo ? '<a href="' + RM.Links.page('reports') + '" class="btn btn-sm btn-secondary">View all</a>' : '') +
					'</div><div id="cbo-mini"></div></div></div>' +
					'<div class="sidebar-section">' +
					'<div class="sidebar-section-label">Actions</div>' +
					(RM.Permissions.can('bulkEnroll') ?
						'<div class="card" id="bulk-enroll-section">' +
						'<div class="card-header"><h2>Bulk Enrollment</h2></div>' +
						'<div class="bulk-enroll-panel">' +
						'<div class="form-group"><label for="bulk-event">Program / event</label>' +
						'<select id="bulk-event">' + RM.ReportEngine.EVENTS.map(function (e) {
							return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
						}).join('') + '</select></div>' +
						'<fieldset class="bulk-client-fieldset"><legend>Select clients</legend>' +
						'<div id="bulk-client-list" class="bulk-client-list"></div></fieldset>' +
						'<button type="button" id="btn-bulk-enroll" class="btn btn-primary btn-sm">Enroll selected</button>' +
						'</div></div>' : '') +
					'<div class="card"><div class="card-header"><h2>Quick Actions</h2></div>' +
					'<div class="quick-actions">' +
					'<a href="' + RM.Links.page('referral-intake') + '" class="btn btn-primary btn-sm">New referral</a>' +
					'<a href="' + RM.Links.page('client-search') + '" class="btn btn-secondary btn-sm">Find client</a>' +
					'<a href="' + RM.Links.page('reports') + '" class="btn btn-secondary btn-sm">Reports</a>' +
					(RM.Permissions.can('bulkEnroll') ?
						'<button type="button" class="btn btn-secondary btn-sm" id="btn-scroll-bulk">Bulk enroll</button>' : '') +
					'</div></div></div></div></div>';

				renderRiskChart(riskReport, riskGroups, total);
				renderDonut(riskReport, total, riskGroups);
				renderCaseload(caseload);
				renderOverdueMini(overdue);
				renderIncompleteMini(incomplete);
				renderCboMini(openCboRefs);
				if (RM.Permissions.can('bulkEnroll')) {
					renderBulkEnrollPanel(caseload);
				}

				wireStatScroll(main);

				document.getElementById('drilldown-close').addEventListener('click', function () {
					clearDrilldown();
				});
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
		var targets = ['caseload-section', 'overdue-mini', 'incomplete-mini', 'cbo-mini'];
		cards.forEach(function (card, i) {
			var targetId = targets[i];
			if (!targetId) { return; }
			var target = document.getElementById(targetId);
			if (!target) { return; }
			card.style.cursor = 'pointer';
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', 'Scroll to ' + (card.querySelector('.stat-label') || {}).textContent);
			function scrollToTarget() {
				var scrollEl = target.closest('.card') || target.closest('#incomplete-section') || target;
				scrollEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			card.addEventListener('click', scrollToTarget);
			card.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					scrollToTarget();
				}
			});
		});
	}

	function buildRiskReport(groups) {
		return RISK_ORDER.map(function (level) {
			return { riskLevel: level, count: (groups[level] || []).length };
		}).filter(function (r) { return r.count > 0; });
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
		var panel = document.getElementById('risk-drilldown');
		var list = document.getElementById('drilldown-list');
		document.getElementById('drilldown-title').textContent = level + ' risk — ' + clients.length + ' client' + (clients.length === 1 ? '' : 's');

		if (!clients.length) {
			list.innerHTML = RM.Components.emptyState('No clients', 'No clients at this risk level.');
		} else {
			list.innerHTML = '<div class="client-chip-list">' + clients.map(function (c) {
				var phone = c.phone || 'No phone';
				return '<div class="client-chip">' +
					'<div><a href="' + RM.Links.page('client-profile', { clientId: c.id }) + '">' +
					RM.Components.escapeHtml(c.name) + '</a>' +
					'<span class="client-chip-meta">' + RM.Components.escapeHtml(phone) +
					(c.incompleteIntake ? ' · <span class="incomplete-badge">Incomplete intake</span>' : '') +
					'</span></div>' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id }) + '" class="btn btn-sm btn-secondary">Open case</a></div>';
			}).join('') + '</div>';
		}
		panel.classList.remove('hidden');
		panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	function clearDrilldown() {
		document.getElementById('risk-drilldown').classList.add('hidden');
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
			'<div class="donut-wrap">' +
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

	function renderCaseload(clients) {
		var el = document.getElementById('caseload-table');
		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState('No active cases', 'New referrals will appear here.');
			return;
		}
		var rows = clients.map(function (c) {
			var a = RM.RiskAssessmentRepository.findLatest(c.id);
			return '<tr class="caseload-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0" aria-label="View case summary for ' + RM.Components.escapeHtml(c.name) + '">' +
				'<td>' + RM.Components.escapeHtml(c.name) + '</td>' +
				'<td>' + RM.Components.formatDate(c.dob) + '</td>' +
				'<td>' + (a ? RM.Components.riskBadge(a.overallRisk) : '—') + '</td>' +
				'<td>' + (c.incompleteIntake ? '<span class="incomplete-badge">Incomplete</span>' :
					'<span style="color:var(--color-success);font-weight:500">Complete</span>') + '</td></tr>';
		}).join('');
		el.innerHTML = '<table class="data-table data-table-interactive"><thead><tr><th>Name</th><th>DOB</th><th>Risk</th><th>Intake</th></tr></thead><tbody>' + rows + '</tbody></table>';

		var table = el.querySelector('.data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.caseload-row', function (row) {
			var client = RM.ClientRepository.findById(row.getAttribute('data-client-id'));
			if (client) {
				RM.Components.openClientDrawer(client.name, client, {}, table, '.caseload-row');
			}
		});
	}

	function renderOverdueMini(overdue) {
		var el = document.getElementById('overdue-mini');
		if (!overdue.length) {
			el.innerHTML = RM.Components.emptyState('All current', 'No overdue follow-ups — great work.');
			return;
		}
		el.innerHTML = '<ul class="mini-list">' + overdue.slice(0, 5).map(function (d) {
			return '<li><a href="' + RM.Links.page('case-workspace', { clientId: d.client.id, tab: 'followup' }) + '">' +
				RM.Components.escapeHtml(d.client.name) + '</a>' +
				'<span class="mini-meta">' + d.daysOverdue + ' days overdue · ' + RM.Components.escapeHtml(d.cadence) + '</span></li>';
		}).join('') + '</ul>';
	}

	function renderIncompleteMini(clients) {
		var el = document.getElementById('incomplete-mini');
		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState('All complete', 'Every active intake has consent and date of birth on file.');
			return;
		}
		el.innerHTML = '<ul class="mini-list">' + clients.map(function (c) {
			return '<li><a href="' + RM.Links.page('case-workspace', { clientId: c.id, tab: 'intake' }) + '">' +
				RM.Components.escapeHtml(c.name) + '</a>' +
				'<span class="mini-meta">Intake incomplete — action required</span></li>';
		}).join('') + '</ul>';
	}

	function renderBulkEnrollPanel(caseload) {
		var listEl = document.getElementById('bulk-client-list');
		if (!listEl) { return; }
		if (!caseload.length) {
			listEl.innerHTML = RM.Components.emptyState('No clients', 'Add referrals to enroll clients in programs.');
			return;
		}
		listEl.innerHTML = caseload.map(function (c) {
			return '<label class="bulk-client-check">' +
				'<input type="checkbox" name="bulk-client" value="' + RM.Components.escapeHtml(c.id) + '">' +
				'<span>' + RM.Components.escapeHtml(c.name) + '</span></label>';
		}).join('');

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

		var scrollBtn = document.getElementById('btn-scroll-bulk');
		if (scrollBtn) {
			scrollBtn.addEventListener('click', function () {
				document.getElementById('bulk-enroll-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
			});
		}
	}

	function renderCboMini(refs) {
		var el = document.getElementById('cbo-mini');
		if (!refs.length) {
			el.innerHTML = RM.Components.emptyState('All confirmed', 'No open CBO referrals pending follow-up.');
			return;
		}
		el.innerHTML = '<ul class="mini-list">' + refs.map(function (r) {
			var client = RM.ClientRepository.findById(r.clientId);
			return '<li><a href="' + RM.Links.page('case-workspace', { clientId: r.clientId, tab: 'services' }) + '">' +
				RM.Components.escapeHtml(client ? client.name : 'Unknown') + '</a>' +
				'<span class="mini-meta">' + RM.Components.escapeHtml(r.cboName) + ' · ' +
				RM.Components.escapeHtml(r.status) + '</span></li>';
		}).join('') + '</ul>';
	}
})();
