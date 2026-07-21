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
			check: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
		},

		icon: function (name) {
			return this.ICONS[name] || this.ICONS.chart;
		},

		escapeHtml: function (str) {
			var div = document.createElement('div');
			div.textContent = str == null ? '' : String(str);
			return div.innerHTML;
		},

		riskBadge: function (level) {
			var cls = 'risk-badge risk-' + (level || 'unknown').toLowerCase();
			var icon = level === 'High' ? '●' : level === 'Medium' || level === 'Moderate' ? '◐' : '○';
			return '<span class="' + cls + '" aria-label="Risk level ' + this.escapeHtml(level) + '">' +
				'<span class="risk-icon" aria-hidden="true">' + icon + '</span> ' +
				this.escapeHtml(level || 'Unknown') + '</span>';
		},

		emptyState: function (title, message) {
			return '<div class="empty-state" role="status">' +
				'<h3>' + this.escapeHtml(title) + '</h3>' +
				'<p>' + this.escapeHtml(message) + '</p></div>';
		},

		pageHeader: function (title, lead) {
			return '<div class="page-header"><div><h1>' + this.escapeHtml(title) + '</h1>' +
				(lead ? '<p class="page-lead">' + this.escapeHtml(lead) + '</p>' : '') +
				'</div></div>';
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
				'<div class="client-drawer-badges">' +
				(assessment ? this.riskBadge(assessment.overallRisk) : '') +
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
					this.drawerMetaRow('Case manager', cm ? RM.Permissions.formatRoleLabel(cm.role) : '—');
			}
			if (options.metaRows) {
				options.metaRows.forEach(function (row) {
					html += self.drawerMetaRow(row.label, row.value);
				});
			}
			html += '</dl>';

			if (options.includeStandardSections !== false) {
				if (referral) {
					html += this.drawerSection('Referral',
						'<p><strong>Source:</strong> ' + this.escapeHtml(referral.source) + '</p>' +
						'<p><strong>Reason:</strong> ' + this.escapeHtml(referral.reason) + '</p>' +
						'<p><strong>Received:</strong> ' + this.formatDate(referral.dateReceived) + '</p>');
				}
				if (intake) {
					html += this.drawerSection('Intake',
						'<p><strong>Living:</strong> ' + this.escapeHtml(intake.livingArrangement || '—') + '</p>' +
						'<p><strong>Consent:</strong> ' + (intake.consentOnFile ? 'On file' : 'Missing') + '</p>' +
						'<p><strong>Status:</strong> ' + this.escapeHtml(intake.completeness || '—') + '</p>');
				}
				if (assessment) {
					html += this.drawerSection('Latest assessment',
						'<p>' + this.formatDate(assessment.date) + ' · Composite ' + assessment.compositeScore + '</p>');
				}
				if (carePlans.length) {
					html += this.drawerSection('Care plan',
						'<ul class="drawer-list">' + carePlans.slice(0, 3).map(function (cp) {
							return '<li>' + self.escapeHtml(cp.issue) + ' — ' + self.escapeHtml(cp.status) + '</li>';
						}).join('') +
						(carePlans.length > 3 ? '<li class="drawer-list-more">+' + (carePlans.length - 3) + ' more in workspace</li>' : '') +
						'</ul>');
				}
				if (latestNote) {
					html += this.drawerSection('Latest case note',
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

		_activeDrawer: null,

		closeSideDrawer: function () {
			if (this._activeDrawer) {
				this._activeDrawer.close();
			}
		},

		openSideDrawer: function (title, bodyHtml, onClose) {
			this.closeSideDrawer();

			var overlay = document.createElement('div');
			overlay.className = 'drawer-overlay';
			overlay.setAttribute('role', 'presentation');
			overlay.innerHTML =
				'<aside class="side-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">' +
				'<div class="drawer-header">' +
				'<h2 id="drawer-title">' + this.escapeHtml(title) + '</h2>' +
				'<button type="button" class="drawer-close" aria-label="Close drawer">×</button>' +
				'</div>' +
				'<div class="drawer-body">' + bodyHtml + '</div>' +
				'</aside>';

			document.body.appendChild(overlay);
			document.body.classList.add('drawer-open');

			var self = this;
			function close() {
				overlay.classList.remove('open');
				document.body.classList.remove('drawer-open');
				document.removeEventListener('keydown', onKeydown);
				window.setTimeout(function () {
					if (overlay.parentNode) {
						overlay.parentNode.removeChild(overlay);
					}
					if (self._activeDrawer && self._activeDrawer.overlay === overlay) {
						self._activeDrawer = null;
					}
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
				if (e.target === overlay) { close(); }
			});
			document.addEventListener('keydown', onKeydown);

			this._activeDrawer = { overlay: overlay, close: close };

			window.requestAnimationFrame(function () {
				overlay.classList.add('open');
			});

			return this._activeDrawer;
		},

		showDuplicateModal: function (matches, onOpen, onContinue) {
			var overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.setAttribute('role', 'dialog');
			overlay.setAttribute('aria-modal', 'true');
			overlay.innerHTML = '<div class="modal">' +
				'<h2>Possible duplicate found</h2>' +
				'<p>This looks like an existing client. Open the record instead?</p>' +
				'<ul class="match-list">' +
				matches.map(function (m) {
					return '<li><strong>' + RM.Components.escapeHtml(m.client.name) + '</strong> — ' +
						'DOB: ' + RM.Components.escapeHtml(m.client.dob || 'unknown') + ', ' +
						'Phone: ' + RM.Components.escapeHtml(m.client.phone) +
						' <button type="button" class="btn btn-primary btn-sm" data-open="' +
						RM.Components.escapeHtml(m.client.id) + '">Open record</button></li>';
				}).join('') +
				'</ul>' +
				'<div class="modal-actions">' +
				'<button type="button" class="btn btn-secondary" id="dup-continue">Continue as new</button>' +
				'<button type="button" class="btn btn-secondary" id="dup-cancel">Cancel</button>' +
				'</div></div>';
			document.body.appendChild(overlay);
			overlay.querySelectorAll('[data-open]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					document.body.removeChild(overlay);
					onOpen(btn.getAttribute('data-open'));
				});
			});
			overlay.querySelector('#dup-continue').addEventListener('click', function () {
				document.body.removeChild(overlay);
				onContinue();
			});
			overlay.querySelector('#dup-cancel').addEventListener('click', function () {
				document.body.removeChild(overlay);
			});
		}
	};
})();
