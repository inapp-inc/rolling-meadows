/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('document');

	RM.DocumentRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().filter(function (d) { return d.clientId === clientId; })
				.sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
		}
	});
})();
