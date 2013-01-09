var XDomain = function ()
{
	this.initialize.apply(this, arguments)
}

XDomain.prototype =
{
	remoteURL:		'',
	remoteDomain:	'',

	initialize: function(frameID)
	{
		this.lastHash = null
		this.cacheCounter = 1
		this.scanTimer = null
		this.rmCallback = null
		this.hasPostMessage = null

		if(frameID)						// binds to the child frame
		{
			this.isMaster = true
			this.frameID = frameID
		}
		else							// binds to the parent
		{
			this.frameID = null
			this.isMaster = false
			this.remoteURL = document.referrer
		}
		this.fetchFrameData()
	},

	// TODO: add support for frames that are not yet loaded

	fetchFrameData: function()
	{
		if(document.getElementById(this.frameID) || !this.isMaster)
		{
			var a = document.createElement('a')
			if(this.isMaster) this.remoteURL = document.getElementById(this.frameID).src
			a.href = this.remoteURL
			this.remoteDomain = a.hostname
		}
	},

	post: function(x, val)
	{
		var o, message = x
		if(typeof val !== 'undefined') message += '=' + typeof val === 'string' ? val : JSON.stringify(val)

		if(this.isMaster)
		{
			if(/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) o = document.getElementById(this.frameID).contentWindow
			else o = window.frames[this.frameID]

			if(this.hasPostMessage)
			{
				if(!o) return
				o.postMessage(message, this.remoteURL.replace(/([^:]+:\/\/[^\/]+).*/, '$1'))
			}
			else if(window.opera) document.getElementById(this.frameID).contentWindow.postMessage(message, this.remoteURL.replace(/([^:]+:\/\/[^\/]+).*/, '$1'))
			else document.getElementById(this.frameID).contentWindow.location = this.remoteURL + '#' + (+new Date) + (this.cacheCounter++) + '&' + message
		}
		else
		{
			if(this.hasPostMessage || window.opera) parent.postMessage(message, this.remoteURL.replace(/([^:]+:\/\/[^\/]+).*/, '$1'))
			else parent.location = this.remoteURL.replace( /#.*$/, '' ) + '#' + (+new Date) + (this.cacheCounter++) + '&' + message
		}
	},

	receiveMessage: function(callback, delay)
	{
		if(this.hasPostMessage || window.opera)
		{
			if(callback)
			{
				this.rmCallback = function(e)
				{
					if(e.origin!==this.remoteDomain) return false
					callback(e)
				}
			}
			if(window['addEventListener']) window[ callback ? 'addEventListener' : 'removeEventListener' ]( 'message', this.rmCallback, false )
			else window[ callback ? 'attachEvent' : 'detachEvent' ]( 'onmessage', this.rmCallback )
		}
		else
		{
			this.scanTimer && clearInterval(this.scanTimer)
			this.scanTimer = null

			if(callback)
			{
				delay = typeof delay === 'number' ? delay : 100

				this.scanTimer = setInterval(function()
				{
					var hash = document.location.hash, re = /^#?\d+&/
					if ( hash !== this.lastHash && re.test(hash) )
					{
						this.lastHash = hash
						callback({ data: hash.replace( re, '' ) })
					}
				}, delay )
			}
		}
	},

	listen: function(map)
	{
		this.receiveMessage(function(e)
		{
			var i, x, a = /\+/g, r = /([^&;=]+)=?([^&;]*)/g,
				d = function (s) { return decodeURIComponent(s.replace(a, ' ')) }

			for(i=map.length;i--;)
			{
				x = r.exec(e.data)
				if(map[ d(x[1]) ]) map[ d(x[1]) ].apply(this, JSON.parse(d(x[2])))
			}
		})
	}
};