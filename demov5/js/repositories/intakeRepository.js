/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('intake');

	RM.IntakeRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().find(function (i) { return i.clientId === clientId; }) || null;
		}
	});
})();
