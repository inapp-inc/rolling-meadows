/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('caseClosure');

	RM.CaseClosureRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().find(function (c) { return c.clientId === clientId; }) || null;
		}
	});
})();
