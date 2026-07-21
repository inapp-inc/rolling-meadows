/* global RM */
(function () {
	'use strict';

	var MAX_SIZE = 512000;

	RM.DocumentService = {
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

		preview: function (docId) {
			var doc = RM.DocumentRepository.findById(docId);
			if (!doc || !doc.dataUrl) { return null; }
			window.open(doc.dataUrl, '_blank');
			return doc;
		},

		download: function (docId) {
			var doc = RM.DocumentRepository.findById(docId);
			if (!doc || !doc.dataUrl) { return; }
			var a = document.createElement('a');
			a.href = doc.dataUrl;
			a.download = doc.filename;
			a.click();
		}
	};
})();
