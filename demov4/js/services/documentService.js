/* global RM */
(function () {
	'use strict';

	var MAX_SIZE = 512000;

	function escapeSvgText(text) {
		return String(text || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function formatDisplayDate(isoDate) {
		if (RM.Components && typeof RM.Components.formatDate === 'function') {
			return RM.Components.formatDate(isoDate);
		}
		return isoDate || '';
	}

	function svgDataUrl(svg) {
		return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
	}

	function consentFormSvg(clientName, signedDate) {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">' +
			'<rect width="612" height="792" fill="#ffffff"/>' +
			'<rect x="48" y="48" width="516" height="696" fill="none" stroke="#1a3a5c" stroke-width="2"/>' +
			'<text x="306" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1a3a5c">Rolling Meadows Senior Services</text>' +
			'<text x="306" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#555555">Client Intake Consent Form</text>' +
			'<line x1="72" y1="140" x2="540" y2="140" stroke="#c5d4e8" stroke-width="1"/>' +
			'<text x="72" y="176" font-family="Arial, sans-serif" font-size="13" fill="#333333">Client name:</text>' +
			'<text x="180" y="176" font-family="Arial, sans-serif" font-size="13" fill="#1a3a5c">' + clientName + '</text>' +
			'<text x="72" y="210" font-family="Arial, sans-serif" font-size="12" fill="#333333">I authorize Rolling Meadows Senior Services to:</text>' +
			'<text x="88" y="236" font-family="Arial, sans-serif" font-size="12" fill="#333333">• Coordinate in-home support and community referrals</text>' +
			'<text x="88" y="258" font-family="Arial, sans-serif" font-size="12" fill="#333333">• Share limited information with partner agencies for care planning</text>' +
			'<text x="88" y="280" font-family="Arial, sans-serif" font-size="12" fill="#333333">• Contact my emergency contact regarding service delivery</text>' +
			'<text x="72" y="330" font-family="Arial, sans-serif" font-size="12" fill="#333333">This consent remains in effect for 12 months unless revoked in writing.</text>' +
			'<text x="72" y="420" font-family="Arial, sans-serif" font-size="12" fill="#333333">Client / representative signature:</text>' +
			'<path d="M 180 450 Q 220 430 260 448 T 340 442" fill="none" stroke="#1a3a5c" stroke-width="2"/>' +
			'<text x="72" y="490" font-family="Arial, sans-serif" font-size="12" fill="#333333">Date signed:</text>' +
			'<text x="160" y="490" font-family="Arial, sans-serif" font-size="12" fill="#1a3a5c">' + signedDate + '</text>' +
			'<text x="72" y="540" font-family="Arial, sans-serif" font-size="12" fill="#333333">Case manager witness:</text>' +
			'<text x="210" y="540" font-family="Arial, sans-serif" font-size="12" fill="#1a3a5c">Case Manager</text>' +
			'<text x="72" y="700" font-family="Arial, sans-serif" font-size="10" fill="#888888">Demo document — Rolling Meadows Case Management prototype</text>' +
			'</svg>';
	}

	function assessmentReportSvg(clientName, reportDate) {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">' +
			'<rect width="612" height="792" fill="#fafbfc"/>' +
			'<rect x="48" y="48" width="516" height="696" fill="#ffffff" stroke="#dde4ec" stroke-width="1"/>' +
			'<text x="72" y="92" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1a3a5c">Home Safety Assessment Summary</text>' +
			'<text x="72" y="118" font-family="Arial, sans-serif" font-size="12" fill="#555555">Client: ' + clientName + ' · Date: ' + reportDate + '</text>' +
			'<rect x="72" y="140" width="468" height="28" fill="#eef4fb"/>' +
			'<text x="84" y="159" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a3a5c">Area</text>' +
			'<text x="300" y="159" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a3a5c">Finding</text>' +
			'<text x="84" y="188" font-family="Arial, sans-serif" font-size="11" fill="#333333">Bathroom</text>' +
			'<text x="300" y="188" font-family="Arial, sans-serif" font-size="11" fill="#333333">Grab bars recommended near tub</text>' +
			'<text x="84" y="212" font-family="Arial, sans-serif" font-size="11" fill="#333333">Stairs</text>' +
			'<text x="300" y="212" font-family="Arial, sans-serif" font-size="11" fill="#333333">Handrail secure; lighting adequate</text>' +
			'<text x="84" y="236" font-family="Arial, sans-serif" font-size="11" fill="#333333">Kitchen</text>' +
			'<text x="300" y="236" font-family="Arial, sans-serif" font-size="11" fill="#333333">Clutter cleared from main walkway</text>' +
			'<text x="84" y="260" font-family="Arial, sans-serif" font-size="11" fill="#333333">Medications</text>' +
			'<text x="300" y="260" font-family="Arial, sans-serif" font-size="11" fill="#333333">Stored in original containers</text>' +
			'<text x="72" y="320" font-family="Arial, sans-serif" font-size="12" fill="#333333">Recommended follow-up: occupational therapy referral for fall-prevention plan.</text>' +
			'<rect x="72" y="360" width="200" height="120" fill="#f0f4f8" stroke="#c5d4e8" stroke-width="1" rx="4"/>' +
			'<text x="172" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#888888">[ Assessment photo ]</text>' +
			'<text x="172" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#888888">Demo placeholder</text>' +
			'<text x="72" y="700" font-family="Arial, sans-serif" font-size="10" fill="#888888">Demo document — Rolling Meadows Case Management prototype</text>' +
			'</svg>';
	}

	RM.DocumentService = {
		isLink: function (doc) {
			return !!(doc && (doc.sourceType === 'url' || doc.externalUrl));
		},

		normalizeUrl: function (raw) {
			var url = (raw || '').trim();
			if (!url) { return null; }
			if (!/^https?:\/\//i.test(url)) {
				url = 'https://' + url;
			}
			try {
				var parsed = new URL(url);
				if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
					return null;
				}
				return parsed.href;
			} catch (err) {
				return null;
			}
		},

		linkHostname: function (url) {
			try {
				return new URL(url).hostname.replace(/^www\./, '');
			} catch (err) {
				return 'External link';
			}
		},

		upload: function (clientId, file, stageContext) {
			return new Promise(function (resolve, reject) {
				if (file.size > MAX_SIZE) {
					reject(new Error('File exceeds 500KB demo limit'));
					return;
				}
				var reader = new FileReader();
				reader.onload = function () {
					var user = RM.Session.getCurrentUser();
					var doc = RM.DocumentRepository.save({
						clientId: clientId,
						filename: file.name,
						sourceType: 'file',
						mimeType: file.type,
						size: file.size,
						dataUrl: reader.result,
						uploadedBy: user ? RM.Permissions.formatRoleLabel(user.role) : 'Unknown',
						uploadedAt: new Date().toISOString(),
						stageContext: stageContext || 'general'
					});
					RM.Audit.record('document:' + doc.id, 'upload', file.name);
					resolve(doc);
				};
				reader.onerror = function () { reject(new Error('Read failed')); };
				reader.readAsDataURL(file);
			});
		},

		buildSampleDocument: function (clientId, kind) {
			var client = RM.ClientRepository.findById(clientId);
			var clientName = escapeSvgText(client ? client.name : 'Client');
			var signedDate = escapeSvgText(
				client && client.createdAt
					? formatDisplayDate(client.createdAt.slice(0, 10))
					: formatDisplayDate('2026-02-02')
			);

			if (kind === 'assessment') {
				var assessmentSvg = assessmentReportSvg(clientName, '2026-02-08');
				return {
					clientId: clientId,
					filename: 'Home Safety Assessment — ' + (client ? client.name : 'Client') + '.svg',
					sourceType: 'file',
					mimeType: 'image/svg+xml',
					size: assessmentSvg.length,
					dataUrl: svgDataUrl(assessmentSvg),
					uploadedBy: 'Demo seed',
					uploadedAt: '2026-02-08T14:30:00.000Z',
					stageContext: 'assessment'
				};
			}

			var consentSvg = consentFormSvg(clientName, signedDate);
			return {
				clientId: clientId,
				filename: 'Intake Consent Form — ' + (client ? client.name : 'Client') + '.svg',
				sourceType: 'file',
				mimeType: 'image/svg+xml',
				size: consentSvg.length,
				dataUrl: svgDataUrl(consentSvg),
				uploadedBy: 'Demo seed',
				uploadedAt: '2026-02-02T10:15:00.000Z',
				stageContext: 'intake'
			};
		},

		addSampleDocument: function (clientId, stageContext) {
			var existing = RM.DocumentRepository.findByClientId(clientId);
			var kind = existing.length ? 'assessment' : 'consent';
			var sample = this.buildSampleDocument(clientId, kind);
			sample.uploadedBy = RM.Session.getCurrentUser()
				? RM.Permissions.formatRoleLabel(RM.Session.getCurrentUser().role)
				: 'Demo user';
			sample.uploadedAt = new Date().toISOString();
			sample.stageContext = stageContext || sample.stageContext;
			var doc = RM.DocumentRepository.save(sample);
			RM.Audit.record('document:' + doc.id, 'upload', doc.filename);
			return doc;
		},

		addLink: function (clientId, title, url, stageContext) {
			var normalized = this.normalizeUrl(url);
			if (!normalized) {
				throw new Error('Enter a valid http or https document URL');
			}
			var displayName = (title || '').trim();
			if (!displayName) {
				displayName = 'Document on ' + this.linkHostname(normalized);
			}
			var user = RM.Session.getCurrentUser();
			var doc = RM.DocumentRepository.save({
				clientId: clientId,
				filename: displayName,
				sourceType: 'url',
				externalUrl: normalized,
				mimeType: 'application/x-url',
				size: 0,
				uploadedBy: user ? RM.Permissions.formatRoleLabel(user.role) : 'Unknown',
				uploadedAt: new Date().toISOString(),
				stageContext: stageContext || 'general'
			});
			RM.Audit.record('document:' + doc.id, 'link_added', displayName);
			return doc;
		},

		buildSampleLink: function (clientId, title, url, stageContext, uploadedAt) {
			return {
				clientId: clientId,
				filename: title,
				sourceType: 'url',
				externalUrl: url,
				mimeType: 'application/x-url',
				size: 0,
				uploadedBy: 'Demo seed',
				uploadedAt: uploadedAt || new Date().toISOString(),
				stageContext: stageContext || 'general'
			};
		},

		renderUploadControls: function () {
			return '<div class="doc-vault-actions">' +
				'<div class="form-group"><label>Upload document</label>' +
				'<input type="file" data-doc-upload accept=".pdf,.png,.jpg,.jpeg,.svg"></div>' +
				'<fieldset class="doc-link-form">' +
				'<legend>Add external link</legend>' +
				'<div class="form-group"><label>Display name</label>' +
				'<input type="text" data-doc-link-title placeholder="e.g. Consent form (Google Drive)"></div>' +
				'<div class="form-group"><label>Document URL</label>' +
				'<input type="url" data-doc-link-url placeholder="https://drive.google.com/..."></div>' +
				'<button type="button" class="btn btn-secondary btn-sm" data-doc-add-link>Add link</button>' +
				'</fieldset>' +
				'<button type="button" class="btn btn-secondary btn-sm" data-doc-add-sample>Add sample document</button>' +
				'<p class="form-hint">Upload a file, link to a document on SharePoint or Google Drive, or add a sample file for demos.</p>' +
				'</div>';
		},

		renderVaultBody: function (readOnly) {
			return '<div class="doc-vault-panel">' +
				(!readOnly ? this.renderUploadControls() : '') +
				'<div data-doc-list class="doc-vault-list"></div></div>';
		},

		isVaultReadOnly: function (client) {
			if (!client) { return true; }
			var closure = RM.CaseClosureRepository.findByClientId(client.id);
			return RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;
		},

		renderDocMeta: function (doc) {
			var meta = RM.Components.escapeHtml(doc.uploadedBy) + ' · ' + RM.Components.formatDate(doc.uploadedAt);
			if (this.isLink(doc)) {
				return meta + ' · ' + RM.Components.escapeHtml(this.linkHostname(doc.externalUrl));
			}
			return meta + ' · ' + Math.max(1, Math.round(doc.size / 1024)) + ' KB';
		},

		renderDocActions: function (doc) {
			if (this.isLink(doc)) {
				return '<div class="doc-list-actions"><button type="button" class="btn btn-sm btn-primary" data-open-link="' +
					RM.Components.escapeHtml(doc.id) + '">Open link</button></div>';
			}
			return '<div class="doc-list-actions"><button type="button" class="btn btn-sm btn-primary" data-preview="' +
				RM.Components.escapeHtml(doc.id) + '">Preview</button></div>';
		},

		renderListHtml: function (clientId, options) {
			options = options || {};
			var docs = RM.DocumentRepository.findByClientId(clientId);
			var self = this;
			var emptyMessage = options.emptyMessage ||
				'Upload a file, add a link to an external drive, or use Add sample document to preview the vault.';
			if (!docs.length) {
				return RM.Components.emptyState('No documents yet', emptyMessage);
			}
			return docs.map(function (d) {
				var linkBadge = self.isLink(d)
					? '<span class="doc-link-badge">External link</span>'
					: '';
				return '<div class="doc-list-item doc-list-item-stacked">' +
					'<div class="doc-list-item-title">' +
					'<strong>' + RM.Components.escapeHtml(d.filename) + '</strong>' +
					linkBadge + '</div>' +
					'<span class="note-meta">' + self.renderDocMeta(d) + '</span>' +
					self.renderDocActions(d) +
					'</div>';
			}).join('');
		},

		mountList: function (clientId, root, options) {
			root = root || document;
			var listEl = root.querySelector('[data-doc-list]');
			if (!listEl) { return null; }
			options = options || {};
			listEl.innerHTML = this.renderListHtml(clientId, options);
			this.wireList(listEl);
			return listEl;
		},

		wireList: function (containerEl) {
			if (!containerEl) { return; }
			containerEl.querySelectorAll('[data-preview]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					RM.DocumentService.preview(btn.getAttribute('data-preview'));
				});
			});
			containerEl.querySelectorAll('[data-download]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					RM.DocumentService.download(btn.getAttribute('data-download'));
				});
			});
			containerEl.querySelectorAll('[data-open-link]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					RM.DocumentService.openLink(btn.getAttribute('data-open-link'));
				});
			});
		},

		wireVault: function (clientId, stageContext, onChange, root) {
			this.mountVault(clientId, root || document, stageContext, {
				onNotify: typeof onChange === 'function'
					? function (message, type) { onChange(message, type); }
					: null
			});
		},

		mountVault: function (clientId, root, stageContext, options) {
			options = options || {};
			root = root || document;
			var listEl = root.querySelector('[data-doc-list]');
			var uploadEl = root.querySelector('[data-doc-upload]');
			var sampleBtn = root.querySelector('[data-doc-add-sample]');
			var linkBtn = root.querySelector('[data-doc-add-link]');
			var linkTitleEl = root.querySelector('[data-doc-link-title]');
			var linkUrlEl = root.querySelector('[data-doc-link-url]');

			function notify(message, type) {
				if (typeof options.onNotify === 'function') {
					options.onNotify(message, type);
				} else if (message && type === 'danger') {
					alert(message);
				}
			}

			function refresh(message, type) {
				if (listEl) {
					RM.DocumentService.mountList(clientId, root, options.listOptions || {});
				}
				if (message) {
					notify(message, type);
				}
			}

			refresh();

			if (uploadEl) {
				uploadEl.addEventListener('change', function (e) {
					var file = e.target.files[0];
					if (!file) { return; }
					RM.DocumentService.upload(clientId, file, stageContext).then(function () {
						refresh('Document uploaded.', 'success');
						e.target.value = '';
					}).catch(function (err) {
						notify(err.message, 'danger');
					});
				});
			}

			if (linkBtn && linkUrlEl) {
				linkBtn.addEventListener('click', function () {
					try {
						RM.DocumentService.addLink(
							clientId,
							linkTitleEl ? linkTitleEl.value : '',
							linkUrlEl.value,
							stageContext
						);
						if (linkTitleEl) { linkTitleEl.value = ''; }
						linkUrlEl.value = '';
						refresh('Document link added.', 'success');
					} catch (err) {
						notify(err.message, 'danger');
					}
				});
			}

			if (sampleBtn) {
				sampleBtn.addEventListener('click', function () {
					RM.DocumentService.addSampleDocument(clientId, stageContext);
					refresh('Sample document added.', 'success');
				});
			}

			return { refresh: refresh };
		},

		openVaultDrawer: function (client, options) {
			options = options || {};
			if (!client) { return null; }

			var docs = RM.DocumentRepository.findByClientId(client.id);
			var lead = docs.length
				? docs.length + ' document' + (docs.length === 1 ? '' : 's') + ' and links on file'
				: 'No documents on file yet.';

			var body =
				'<p class="doc-vault-drawer-lead">' + RM.Components.escapeHtml(lead) + '</p>' +
				'<div data-doc-list class="doc-vault-list"></div>' +
				'<div class="drawer-actions doc-vault-drawer-actions">' +
				'<a href="' + RM.Links.page('case-workspace', { clientId: client.id, tab: 'documents' }) +
				'" class="btn btn-secondary btn-sm">Add or manage in workspace</a></div>';

			var drawer = RM.Components.openSideDrawer(
				client.name + ' — Document Vault',
				body,
				options.onClose,
				{ kind: 'doc-vault', side: options.side }
			);

			this.mountList(client.id, drawer.overlay.querySelector('.drawer-body'), {
				emptyMessage: 'Add documents or links in the case workspace.'
			});

			return drawer;
		},

		renderPreviewDownloadAction: function (doc) {
			return '<button type="button" class="modal-icon-btn" id="doc-preview-download" aria-label="Download ' +
				RM.Components.escapeHtml(doc.filename) + '">' +
				RM.Components.icon('download') + '</button>';
		},

		openFilePreviewModal: function (doc, bodyHtml) {
			RM.Components.openModal(doc.filename, bodyHtml, null, {
				wide: true,
				modalClass: 'doc-preview-modal',
				headerActionsHtml: this.renderPreviewDownloadAction(doc)
			});
			this.wirePreviewDownload(doc.id);
		},

		wirePreviewDownload: function (docId) {
			var overlay = RM.Components._activeModal && RM.Components._activeModal.overlay;
			if (!overlay) { return; }
			var dlBtn = overlay.querySelector('#doc-preview-download');
			if (dlBtn) {
				dlBtn.addEventListener('click', function () {
					RM.DocumentService.download(docId);
				});
			}
		},

		openLink: function (docId) {
			var doc = RM.DocumentRepository.findById(docId);
			if (!doc || !this.isLink(doc)) { return null; }
			window.open(doc.externalUrl, '_blank', 'noopener,noreferrer');
			return doc;
		},

		preview: function (docId) {
			var doc = RM.DocumentRepository.findById(docId);
			if (!doc) { return null; }

			if (this.isLink(doc)) {
				var linkBody =
					'<div class="doc-link-preview">' +
					'<p>This document is stored externally. Open it in a new tab to view the file on the linked drive or site.</p>' +
					'<p class="doc-link-preview-url"><strong>Location:</strong> ' +
					RM.Components.escapeHtml(doc.externalUrl) + '</p>' +
					'<div class="modal-actions">' +
					'<button type="button" class="btn btn-primary" id="doc-preview-open-link">Open link</button>' +
					'</div></div>';
				RM.Components.openModal(doc.filename, linkBody, null, { modalClass: 'doc-preview-modal' });
				var overlay = RM.Components._activeModal && RM.Components._activeModal.overlay;
				if (overlay) {
					var openBtn = overlay.querySelector('#doc-preview-open-link');
					if (openBtn) {
						openBtn.addEventListener('click', function () {
							RM.DocumentService.openLink(docId);
						});
					}
				}
				return doc;
			}

			if (!doc.dataUrl) { return null; }

			var body = document.createElement('div');
			body.className = 'doc-preview-wrap';

			if (doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.filename)) {
				var iframe = document.createElement('iframe');
				iframe.className = 'doc-preview-frame';
				iframe.src = doc.dataUrl;
				iframe.title = doc.filename;
				body.appendChild(iframe);
				this.openFilePreviewModal(doc, '<div class="doc-preview-wrap">' + body.innerHTML + '</div>');
				return doc;
			}

			if (/^image\//.test(doc.mimeType) || doc.dataUrl.indexOf('data:image') === 0) {
				var img = document.createElement('img');
				img.className = 'doc-preview-image';
				img.src = doc.dataUrl;
				img.alt = doc.filename;
				body.appendChild(img);
				this.openFilePreviewModal(doc, '<div class="doc-preview-wrap">' + body.innerHTML + '</div>');
				return doc;
			}

			this.openFilePreviewModal(
				doc,
				'<div class="doc-preview-wrap doc-preview-wrap-empty">' +
				'<p class="text-muted">Preview is not available for this file type.</p></div>'
			);
			return doc;
		},

		download: function (docId) {
			var doc = RM.DocumentRepository.findById(docId);
			if (!doc) { return; }
			if (this.isLink(doc)) {
				this.openLink(docId);
				return;
			}
			if (!doc.dataUrl) { return; }
			var a = document.createElement('a');
			a.href = doc.dataUrl;
			a.download = doc.filename;
			a.click();
		}
	};
})();
