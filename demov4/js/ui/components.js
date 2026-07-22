/* global RM */
(function () {
	'use strict';

	RM.Components = {
		ICONS: {
			users: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
			clock: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
			clipboard: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
			link: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
			bell: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
			chart: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
			check: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
			download: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
		},

		icon: function (name) {
			return this.ICONS[name] || this.ICONS.chart;
		},

		escapeHtml: function (str) {
			var div = document.createElement('div');
			div.textContent = str == null ? '' : String(str);
			return div.innerHTML;
		},

		tableResponsive: function (tableHtml) {
			return '<div class="table-responsive">' + tableHtml + '</div>';
		},

		riskBadge: function (level) {
			var cls = 'risk-badge risk-' + (level || 'unknown').toLowerCase();
			var icon = level === 'High' ? '●' : level === 'Medium' || level === 'Moderate' ? '◐' : '○';
			return '<span class="' + cls + '" aria-label="Risk level ' + this.escapeHtml(level) + '">' +
				'<span class="risk-icon" aria-hidden="true">' + icon + '</span> ' +
				this.escapeHtml(level || 'Unknown') + '</span>';
		},

		workflowStageBadge: function (client) {
			if (!client || !RM.Workflow) {
				return '';
			}
			var status = RM.Workflow.getStatus(client);
			return '<span class="workflow-stage-badge" data-stage="' + status.stage + '" title="Process stage">' +
				this.escapeHtml(status.shortLabel || status.label) + '</span>';
		},

		processStageBadge: function (client) {
			return this.workflowStageBadge(client);
		},

		workflowStageLabel: function (client) {
			if (!client || !RM.Workflow) {
				return '';
			}
			return RM.Workflow.getStatus(client).label;
		},

		caseCategoryLabel: function (client) {
			if (!client || !RM.CaseCategories) {
				return '—';
			}
			var cat = RM.CaseCategories.categoryLabel(client.caseCategoryId);
			var sub = RM.CaseCategories.subcategoryLabel(client.caseSubcategoryId);
			return cat + ' · ' + sub;
		},

		caseCategoryBadge: function (client) {
			if (!client || !client.caseCategoryId) {
				return '';
			}
			return '<span class="case-category-badge" title="Case category">' +
				this.escapeHtml(this.caseCategoryLabel(client)) + '</span>';
		},

		stepStatusPill: function (status, label) {
			return '<span class="step-status-pill step-status-' + (status || 'not_started') + '">' +
				this.escapeHtml(label || status || '') + '</span>';
		},

		emptyState: function (title, message) {
			return '<div class="empty-state" role="status">' +
				'<h3>' + this.escapeHtml(title) + '</h3>' +
				'<p>' + this.escapeHtml(message) + '</p></div>';
		},

		pageHeader: function (title, options) {
			options = options || {};
			var moduleCrumb = options.moduleId && RM.Modules
				? '<p class="page-module-crumb">' + this.escapeHtml(RM.Modules.labelForModule(options.moduleId)) + '</p>'
				: (options.moduleLabel
					? '<p class="page-module-crumb">' + this.escapeHtml(options.moduleLabel) + '</p>'
					: '');
			var lead = options.lead
				? '<p class="page-lead">' + this.escapeHtml(options.lead) + '</p>'
				: '';
			return '<div class="page-header"><div>' + moduleCrumb +
				'<h1>' + this.escapeHtml(title) + '</h1>' + lead +
				'</div></div>';
		},

		modulePageHeader: function (navId, titleOverride) {
			var item = RM.Modules && RM.Modules.navItem(navId);
			var title = titleOverride || (item ? item.label : '');
			var moduleId = item ? item.moduleId : null;
			return this.pageHeader(title, { moduleId: moduleId });
		},

		statCard: function (value, label, iconName, variant, goHref) {
			var goAttr = goHref ? ' data-go="' + goHref + '"' : '';
			return '<div class="stat-card stat-' + (variant || 'primary') + '"' + goAttr + '>' +
				'<div class="stat-card-inner">' +
				'<div><div class="stat-value">' + value + '</div>' +
				'<div class="stat-label">' + this.escapeHtml(label) + '</div></div>' +
				'<div class="stat-icon">' + this.icon(iconName) + '</div>' +
				'</div></div>';
		},

		showToast: function (message, type) {
			type = type || 'success';
			var container = document.getElementById('toast-container');
			if (!container) {
				container = document.createElement('div');
				container.id = 'toast-container';
				container.className = 'toast-container';
				container.setAttribute('aria-live', 'polite');
				container.setAttribute('aria-atomic', 'true');
				document.body.appendChild(container);
			}
			var toast = document.createElement('div');
			toast.className = 'toast toast-' + type;
			toast.innerHTML = (type === 'success' ? this.icon('check') : '') +
				'<span>' + this.escapeHtml(message) + '</span>';
			container.appendChild(toast);
			window.requestAnimationFrame(function () { toast.classList.add('show'); });
			window.setTimeout(function () {
				toast.classList.remove('show');
				window.setTimeout(function () {
					if (toast.parentNode) { toast.parentNode.removeChild(toast); }
				}, 300);
			}, 3200);
		},

		alert: function (type, message) {
			return '<div class="alert alert-' + type + '" role="alert">' + this.escapeHtml(message) + '</div>';
		},

		alertHtml: function (type, html) {
			return '<div class="alert alert-' + type + '" role="alert">' + html + '</div>';
		},

		matchConfidenceBadge: function (score) {
			var label = score >= 50 ? 'Strong' : score >= 35 ? 'Likely' : 'Possible';
			var cls = score >= 50 ? 'confidence-high' : score >= 35 ? 'confidence-medium' : 'confidence-low';
			return '<span class="match-confidence ' + cls + '" title="Match score ' + score + '">' + label + ' match</span>';
		},

		renderDedupMatches: function (matches, options) {
			options = options || {};
			if (!matches.length) { return ''; }
			var self = this;
			var items = matches.map(function (m) {
				return '<li><strong>' + self.escapeHtml(m.client.name) + '</strong> ' +
					self.matchConfidenceBadge(m.score) + ' · matched on ' +
					self.escapeHtml(m.matchedFields.join(', ')) +
					(options.linkClient ?
						' · <a href="#" class="dedup-open-link" data-client-id="' + self.escapeHtml(m.client.id) + '">Open record</a>' :
						'') +
					'</li>';
			}).join('');
			return this.alertHtml('warning',
				'<strong>Possible duplicate' + (matches.length > 1 ? 's' : '') + ' found</strong>' +
				'<ul class="dedup-match-list">' + items + '</ul>');
		},

		renderCrossProgramFlag: function (flag) {
			if (!flag) { return ''; }
			return this.alertHtml('warning',
				'<strong>Cross-program flag</strong> — ' + this.escapeHtml(RM.CrossProgramFlagService.formatMessage(flag)));
		},

		voidedLabel: function (item) {
			if (!item || !item.voided) { return ''; }
			return ' <span class="voided-label">Voided · ' + this.escapeHtml(item.voidReason || 'No reason') + '</span>';
		},

		renderActivityLog: function (entries) {
			if (!entries.length) {
				return this.emptyState('No activity yet', 'Case actions, voids, and uploads appear here.');
			}
			var self = this;
			return '<ul class="activity-log">' + entries.map(function (entry) {
				return '<li class="activity-entry">' +
					'<span class="activity-action">' + self.escapeHtml(entry.actionLabel || entry.action) + '</span>' +
					'<span class="activity-meta">' + self.escapeHtml(entry.actorName) + ' · ' +
					self.formatDate(entry.timestamp) +
					(entry.reason ? ' · Reason: ' + self.escapeHtml(entry.reason) : '') +
					'</span></li>';
			}).join('') + '</ul>';
		},

		renderRatingsCompare: function (previousRatings, newRatings, client) {
			var self = this;
			var domains = client && RM.CaseForm
				? RM.CaseForm.ratingDomainKeys(client, previousRatings || newRatings)
				: RM.FormHelpers.DOMAINS;
			var rows = domains.map(function (domain) {
				var prev = previousRatings ? previousRatings[domain] : null;
				var curr = newRatings ? newRatings[domain] : null;
				if (!prev && !curr) { return ''; }
				var changed = prev && curr && prev !== curr;
				function cell(val) {
					return val ? self.riskBadge(val) : '—';
				}
				var label = RM.CaseForm ? RM.CaseForm.domainLabel(domain) : RM.FormHelpers.formatDomain(domain);
				return '<tr class="' + (changed ? 'compare-changed' : '') + '">' +
					'<td>' + self.escapeHtml(label) + '</td>' +
					'<td>' + cell(prev) + '</td><td>' + cell(curr) + '</td>' +
					'<td>' + (changed ? '<span class="compare-delta">Changed</span>' : '') + '</td></tr>';
			}).join('');
			return '<table class="data-table compare-table"><thead><tr><th>Domain</th><th>Previous</th><th>Current</th><th></th></tr></thead><tbody>' +
				rows + '</tbody></table>';
		},

		exportCsv: function (filename, rows, columns) {
			if (!rows.length) { return; }
			var header = columns.map(function (c) { return c.label; }).join(',');
			var lines = rows.map(function (row) {
				return columns.map(function (c) {
					var val = row[c.key];
					val = val == null ? '' : String(val);
					if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1) {
						val = '"' + val.replace(/"/g, '""') + '"';
					}
					return val;
				}).join(',');
			});
			var csv = [header].concat(lines).join('\n');
			var blob = new Blob([csv], { type: 'text/csv' });
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = filename;
			a.click();
			URL.revokeObjectURL(a.href);
		},

		formatDate: function (iso) {
			if (!iso) { return '—'; }
			try {
				return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
			} catch (e) {
				return iso;
			}
		},

		promptVoid: function (callback) {
			var reason = window.prompt('Enter reason for voiding this entry (required):');
			if (reason && reason.trim()) {
				callback(reason.trim());
			}
		},

		clientChipList: function (clients) {
			if (!clients.length) {
				return this.emptyState('No clients', 'No clients at this risk level.');
			}
			return '<div class="client-chip-list">' + clients.map(function (c) {
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
		},

		clientInitials: function (name) {
			return (name || 'C').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
		},

		drawerMetaRow: function (label, value) {
			return '<div class="client-drawer-meta-row"><dt>' + this.escapeHtml(label) + '</dt>' +
				'<dd>' + this.escapeHtml(value == null || value === '' ? '—' : String(value)) + '</dd></div>';
		},

		drawerSection: function (title, bodyHtml) {
			return '<div class="client-drawer-section"><h4>' + this.escapeHtml(title) + '</h4>' + bodyHtml + '</div>';
		},

		clientCaseDrawer: function (client, options) {
			options = options || {};
			var self = this;
			var cfg = RM.CaseForm.configForClient(client);
			var intakeCtx = RM.CaseForm.stageContext(client, 'intake');
			var assessmentCtx = RM.CaseForm.stageContext(client, 'assessment');
			var riskCtx = RM.CaseForm.stageContext(client, 'risk');
			var carePlanCtx = RM.CaseForm.stageContext(client, 'careplan');
			var followupCtx = RM.CaseForm.stageContext(client, 'followup');
			var workflow = RM.CaseWorkflow.forClient(client);
			var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
			var intake = RM.IntakeRepository.findByClientId(client.id);
			var referral = RM.ReferralRepository.findByClientId(client.id)[0];
			var notes = RM.CaseNoteRepository.findByClientId(client.id);
			var latestNote = notes.length
				? notes.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]
				: null;
			var carePlans = RM.CarePlanRepository.findByClientId(client.id);
			var cm = RM.UserRepository.findById(client.caseManagerId);
			var closure = RM.CaseClosureRepository.findByClientId(client.id);
			var workspaceUrl = RM.Links.page('case-workspace', {
				clientId: client.id,
				tab: options.workspaceTab || undefined
			});

			var html =
				'<div class="client-drawer-summary">' +
				'<div class="client-drawer-header">' +
				'<div class="profile-avatar client-drawer-avatar" aria-hidden="true">' + this.clientInitials(client.name) + '</div>' +
				'<div class="client-drawer-title">' +
				'<h3>' + this.escapeHtml(client.name) + '</h3>' +
				'<p class="client-drawer-workflow">' + this.escapeHtml(workflow.name) + '</p>' +
				'<div class="client-drawer-badges">' +
				(assessment ? this.riskBadge(assessment.overallRisk) : '') +
				this.workflowStageBadge(client) +
				(!options.hideStatusBadge ? '<span class="client-status-badge">' + this.escapeHtml(client.status) + '</span>' : '') +
				(client.incompleteIntake ? '<span class="incomplete-badge">Incomplete intake</span>' : '') +
				(options.badgeHtml || '') +
				'</div></div></div>';

			if (options.alert) {
				html += this.alert(options.alert.type || 'info', options.alert.message);
			}

			html += '<dl class="client-drawer-meta">';
			if (options.includeStandardMeta !== false) {
				html += this.drawerMetaRow('DOB', this.formatDate(client.dob)) +
					this.drawerMetaRow('Phone', client.phone) +
					this.drawerMetaRow('Address', client.address) +
					this.drawerMetaRow('Category', RM.CaseCategories.categoryLabel(client.caseCategoryId)) +
					this.drawerMetaRow('Process stage', this.workflowStageLabel(client)) +
					this.drawerMetaRow('Case manager', cm ? RM.Permissions.formatRoleLabel(cm.role) : '—');
			}
			if (options.metaRows) {
				options.metaRows.forEach(function (row) {
					html += self.drawerMetaRow(row.label, row.value);
				});
			}
			html += '</dl>';

			if (options.includeStandardSections !== false) {
				if (referral || intake) {
					var intakeBody = '';
					if (referral) {
						intakeBody +=
							'<p><strong>Source:</strong> ' + this.escapeHtml(referral.source) + '</p>' +
							'<p><strong>Reason:</strong> ' + this.escapeHtml(referral.reason) + '</p>' +
							'<p><strong>Received:</strong> ' + this.formatDate(referral.dateReceived) + '</p>';
					}
					if (intake) {
						intakeBody +=
							'<p><strong>' + this.escapeHtml(cfg.livingLabel) + ':</strong> ' +
							this.escapeHtml(intake.livingArrangement || '—') + '</p>' +
							'<p><strong>' + this.escapeHtml(cfg.backgroundLabel) + ':</strong> ' +
							this.escapeHtml(intake.medicalHistory || '—') + '</p>' +
							'<p><strong>Consent:</strong> ' + (intake.consentOnFile ? 'On file' : 'Missing') + '</p>' +
							'<p><strong>Status:</strong> ' + this.escapeHtml(intake.completeness || '—') + '</p>';
					}
					html += this.drawerSection(intakeCtx.title, intakeBody);
				}
				if (intake && intake.comprehensiveAssessmentNotes) {
					html += this.drawerSection(assessmentCtx.title,
						'<p><strong>' + this.escapeHtml(cfg.assessmentNoteLabel) + ':</strong> ' +
						this.escapeHtml(intake.comprehensiveAssessmentNotes) + '</p>');
				}
				if (assessment) {
					html += this.drawerSection(riskCtx.title,
						'<p class="profile-inline-meta">' + this.formatDate(assessment.date) + ' · Composite ' +
						assessment.compositeScore + ' · ' + this.escapeHtml(assessment.overallRisk) + '</p>' +
						RM.CaseForm.formatRatingsList(assessment.ratings, client));
				}
				if (carePlans.length) {
					html += this.drawerSection(carePlanCtx.title,
						'<ul class="drawer-list">' + carePlans.slice(0, 3).map(function (cp) {
							return '<li><strong>' + self.escapeHtml(cp.issue) + '</strong> — ' +
								self.escapeHtml(cp.goal) + ' · ' + self.escapeHtml(cp.status) + '</li>';
						}).join('') +
						(carePlans.length > 3 ? '<li class="drawer-list-more">+' + (carePlans.length - 3) + ' more in workspace</li>' : '') +
						'</ul>');
				}
				if (latestNote) {
					html += this.drawerSection(followupCtx.title,
						'<div class="note-entry drawer-note">' +
						'<div class="note-meta">' + this.formatDate(latestNote.date) + ' · ' + this.escapeHtml(latestNote.type) + '</div>' +
						'<p>' + this.escapeHtml(latestNote.text) + '</p></div>');
				}
			}

			if (options.sections) {
				options.sections.forEach(function (section) {
					html += self.drawerSection(section.title, section.body);
				});
			}

			if (closure) {
				html += this.alert('info', 'Case closed — workspace is read-only.');
			}

			html +=
				'<div class="drawer-actions">' +
				'<a href="' + workspaceUrl + '" class="btn btn-primary">' +
				this.escapeHtml(options.primaryActionLabel || 'Open Case Workspace') + '</a>' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary">360° View</a>' +
				'</div></div>';

			return html;
		},

		caseWorkflowDrawerBody: function (client) {
			var workflow = RM.CaseWorkflow.forClient(client);
			var statuses = RM.Workflow.getAllStageStatuses(client);
			var current = RM.Workflow.getStatus(client);
			var referral = RM.ReferralRepository.findByClientId(client.id)[0];
			var cm = RM.UserRepository.findById(client.caseManagerId);
			var focusHtml = workflow.focusAreas.length
				? '<ul class="case-focus-list">' + workflow.focusAreas.map(function (f) {
					return '<li>' + RM.Components.escapeHtml(f) + '</li>';
				}).join('') + '</ul>'
				: '<p class="text-muted">No focus areas defined.</p>';

			var stageRows = statuses.map(function (s) {
				var cls = 'case-stage-row case-stage-' + s.status + (s.stage === current.stage ? ' case-stage-current' : '');
				return '<div class="' + cls + '">' +
					'<span class="case-stage-num">' + (s.status === 'complete' ? '✓' : s.stage) + '</span>' +
					'<div class="case-stage-body">' +
					'<strong>' + RM.Components.escapeHtml(s.label) + '</strong>' +
					(s.deliverable ? '<span class="case-stage-deliverable">' + RM.Components.escapeHtml(s.deliverable) + '</span>' : '') +
					'</div>' +
					RM.Components.stepStatusPill(s.status, s.status.replace('_', ' ')) +
					'</div>';
			}).join('');

			return '<div class="case-drawer-summary">' +
				'<p class="case-detail-sub">' + RM.Components.escapeHtml(workflow.name) + '</p>' +
				'<div class="client-drawer-badges">' +
				RM.Components.caseCategoryBadge(client) +
				RM.Components.workflowStageBadge(client) +
				'</div>' +
				'<dl class="client-drawer-meta">' +
				this.drawerMetaRow('Case manager', cm ? cm.name : '—') +
				this.drawerMetaRow('Opened', this.formatDate(client.createdAt)) +
				this.drawerMetaRow('Status', client.status) +
				'</dl>' +
				'<p class="case-detail-desc">' + RM.Components.escapeHtml(workflow.description) + '</p>' +
				(referral ? '<p class="case-detail-example"><strong>Referral:</strong> ' +
					RM.Components.escapeHtml(referral.source) + ' — ' + RM.Components.escapeHtml(referral.reason) + '</p>' : '') +
				(workflow.exampleProgram ? '<p class="case-detail-example"><strong>Program example:</strong> ' +
					RM.Components.escapeHtml(workflow.exampleProgram) + '</p>' : '') +
				this.drawerSection('Focus areas', focusHtml) +
				this.drawerSection('Workflow progress', '<div class="case-stage-list">' + stageRows + '</div>') +
				'<div class="drawer-actions">' +
				'<a href="' + RM.Links.page('case-workspace', { clientId: client.id }) + '" class="btn btn-primary">Open case workspace</a>' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary">360° view</a>' +
				'</div></div>';
		},

		openCaseDrawer: function (client, tableEl, rowSelector) {
			this.openSideDrawer(client.name, this.caseWorkflowDrawerBody(client), function () {
				if (tableEl && rowSelector) {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
				}
			});
		},

		wireInteractiveTable: function (tableEl, rowSelector, onActivate) {
			if (!tableEl) { return; }
			tableEl.querySelectorAll(rowSelector).forEach(function (row) {
				function activate() {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
					row.classList.add('active');
					onActivate(row);
				}
				row.addEventListener('click', activate);
				row.addEventListener('keydown', function (e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						activate();
					}
				});
			});
		},

		openClientDrawer: function (title, client, options, tableEl, rowSelector) {
			var self = this;
			this.openSideDrawer(title || client.name, this.clientCaseDrawer(client, options), function () {
				if (tableEl && rowSelector) {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
				}
			});
		},

		_activeDrawers: { left: null, right: null },

		_syncDrawerOpenClass: function () {
			if (this._activeDrawers.left || this._activeDrawers.right) {
				document.body.classList.add('drawer-open');
			} else {
				document.body.classList.remove('drawer-open');
			}
		},

		closeSideDrawer: function (side) {
			if (!side) {
				this.closeSideDrawer('left');
				this.closeSideDrawer('right');
				return;
			}
			var drawer = this._activeDrawers[side];
			if (drawer) {
				drawer.close();
			}
		},

		openDedupClientRecord: function (clientId) {
			var client = RM.ClientRepository.findById(clientId);
			if (!client) { return; }
			this.openClientDrawer(client.name, client, {});
		},

		_activeModal: null,

		closeModal: function () {
			if (this._activeModal) {
				this._activeModal.close();
			}
		},

		openModal: function (title, bodyHtml, onClose, options) {
			options = options || {};
			this.closeModal();

			var modalClass = 'modal' + (options.wide ? ' modal-wide' : '');
			if (options.modalClass) {
				modalClass += ' ' + options.modalClass;
			}

			var overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.setAttribute('role', 'presentation');
			overlay.innerHTML =
				'<div class="' + modalClass + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
				'<div class="modal-header">' +
				'<h2 id="modal-title">' + this.escapeHtml(title) + '</h2>' +
				'<div class="modal-header-controls">' +
				(options.headerActionsHtml || '') +
				'<button type="button" class="modal-close" aria-label="Close dialog">×</button>' +
				'</div></div>' +
				'<div class="modal-body">' + bodyHtml + '</div>' +
				'</div>';

			document.body.appendChild(overlay);
			document.body.classList.add('modal-open');

			var self = this;
			function close() {
				document.body.classList.remove('modal-open');
				document.removeEventListener('keydown', onKeydown);
				if (overlay.parentNode) {
					overlay.parentNode.removeChild(overlay);
				}
				if (self._activeModal && self._activeModal.overlay === overlay) {
					self._activeModal = null;
				}
				if (typeof onClose === 'function') {
					onClose();
				}
			}

			function onKeydown(e) {
				if (e.key === 'Escape') { close(); }
			}

			overlay.querySelector('.modal-close').addEventListener('click', close);
			overlay.addEventListener('click', function (e) {
				if (e.target === overlay) { close(); }
			});
			document.addEventListener('keydown', onKeydown);

			this._activeModal = {
				overlay: overlay,
				close: close
			};

			return this._activeModal;
		},

		openSideDrawer: function (title, bodyHtml, onClose, options) {
			options = options || {};
			var side = options.side === 'left' ? 'left' : 'right';
			var otherSide = side === 'left' ? 'right' : 'left';
			var hasOtherDrawer = !!this._activeDrawers[otherSide];
			this.closeSideDrawer(side);

			var sideClass = side === 'left' ? ' side-drawer-left' : '';
			var overlayClass = 'drawer-overlay';
			if (hasOtherDrawer && side === 'right') {
				overlayClass += ' drawer-overlay-no-backdrop';
			}

			var overlay = document.createElement('div');
			overlay.className = overlayClass;
			overlay.setAttribute('role', 'presentation');
			if (hasOtherDrawer && side === 'right') {
				overlay.style.zIndex = '1102';
			}
			overlay.innerHTML =
				'<aside class="side-drawer' + sideClass + '" role="dialog" aria-modal="true" aria-labelledby="drawer-title-' + side + '">' +
				'<div class="drawer-header">' +
				'<h2 id="drawer-title-' + side + '">' + this.escapeHtml(title) + '</h2>' +
				'<button type="button" class="drawer-close" aria-label="Close drawer">×</button>' +
				'</div>' +
				'<div class="drawer-body">' + bodyHtml + '</div>' +
				'</aside>';

			document.body.appendChild(overlay);
			this._syncDrawerOpenClass();

			var self = this;
			function close() {
				overlay.classList.remove('open');
				document.removeEventListener('keydown', onKeydown);
				window.setTimeout(function () {
					if (overlay.parentNode) {
						overlay.parentNode.removeChild(overlay);
					}
					if (self._activeDrawers[side] && self._activeDrawers[side].overlay === overlay) {
						self._activeDrawers[side] = null;
					}
					self._syncDrawerOpenClass();
					if (typeof onClose === 'function') {
						onClose();
					}
				}, 280);
			}

			function onKeydown(e) {
				if (e.key === 'Escape') { close(); }
			}

			overlay.querySelector('.drawer-close').addEventListener('click', close);
			overlay.addEventListener('click', function (e) {
				if (e.target === overlay && !overlay.classList.contains('drawer-overlay-no-backdrop')) {
					close();
				}
			});
			document.addEventListener('keydown', onKeydown);

			this._activeDrawers[side] = {
				overlay: overlay,
				close: close,
				kind: options.kind || null,
				side: side
			};

			window.requestAnimationFrame(function () {
				overlay.classList.add('open');
			});

			return this._activeDrawers[side];
		},

		renderDedupDrawerBody: function (matches, options) {
			options = options || {};
			var self = this;
			if (!matches.length) { return ''; }

			var items = matches.map(function (m) {
				return '<li class="dedup-drawer-item">' +
					'<div class="dedup-drawer-match">' +
					'<strong>' + self.escapeHtml(m.client.name) + '</strong> ' +
					self.matchConfidenceBadge(m.score) +
					'<div class="dedup-drawer-meta">Matched on ' + self.escapeHtml(m.matchedFields.join(', ')) + '</div>' +
					'<div class="dedup-drawer-meta">DOB: ' + self.escapeHtml(m.client.dob || 'unknown') +
					' · Phone: ' + self.escapeHtml(m.client.phone || '—') + '</div>' +
					'</div>' +
					(options.showOpenButtons !== false ?
						'<button type="button" class="btn btn-primary btn-sm dedup-open-btn" data-client-id="' +
						self.escapeHtml(m.client.id) + '">Open record</button>' : '') +
					'</li>';
			}).join('');

			var actions = options.showContinue ?
				'<div class="dedup-drawer-actions">' +
				'<button type="button" class="btn btn-secondary" id="dedup-continue">Continue as new</button>' +
				'</div>' : '';

			return '<p class="dedup-drawer-lead">This client may already exist in the system. Review the matches below before continuing.</p>' +
				'<ul class="dedup-drawer-list">' + items + '</ul>' + actions;
		},

		wireDedupDrawer: function (overlay, options) {
			options = options || {};
			if (!overlay) { return; }

			overlay.querySelectorAll('.dedup-open-btn').forEach(function (btn) {
				btn.addEventListener('click', function () {
					var clientId = btn.getAttribute('data-client-id');
					if (typeof options.onOpen === 'function') {
						options.onOpen(clientId);
					} else {
						RM.Components.openDedupClientRecord(clientId);
					}
				});
			});

			var continueBtn = overlay.querySelector('#dedup-continue');
			if (continueBtn && typeof options.onContinue === 'function') {
				continueBtn.addEventListener('click', function () {
					RM.Components.closeSideDrawer('left');
					RM.Components.closeSideDrawer('right');
					options.onContinue();
				});
			}
		},

		showDedupDrawer: function (matches, options) {
			options = options || {};
			if (!matches.length) {
				if (this._activeDrawers.left && this._activeDrawers.left.kind === 'dedup') {
					this.closeSideDrawer('left');
				}
				return;
			}

			var title = 'Possible duplicate' + (matches.length > 1 ? 's' : '') + ' found';
			var body = this.renderDedupDrawerBody(matches, options);
			var drawer = this._activeDrawers.left;

			if (drawer && drawer.kind === 'dedup' && drawer.overlay) {
				drawer.overlay.querySelector('.drawer-body').innerHTML = body;
				drawer.overlay.querySelector('#drawer-title-left').textContent = title;
				this.wireDedupDrawer(drawer.overlay, options);
				return;
			}

			drawer = this.openSideDrawer(title, body, null, { side: 'left', kind: 'dedup' });
			this.wireDedupDrawer(drawer.overlay, options);
		},

		showDuplicateModal: function (matches, onOpen, onContinue) {
			this.showDedupDrawer(matches, {
				showContinue: true,
				onOpen: onOpen,
				onContinue: onContinue
			});
		}
	};
})();
