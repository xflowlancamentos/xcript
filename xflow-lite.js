// xflow-lite.js
(function() {
  // 1) onDOMReady
  function onDOMReady(cb) {
    if (document.readyState !== 'loading') return cb();
    document.addEventListener('DOMContentLoaded', cb);
  }

  // 2) Utilitários simplificados
  var utils = {
    getURLParam: function(key) {
      return new URLSearchParams(location.search).get(key) || '';
    },
    getUTMParams: function() {
      var p = new URLSearchParams(location.search);
      return {
        utm_source:   p.get('utm_source')   || '',
        utm_medium:   p.get('utm_medium')   || '',
        utm_campaign: p.get('utm_campaign') || '',
        utm_id:       p.get('utm_id')       || '',
        utm_term:     p.get('utm_term')     || '',
        utm_content:  p.get('utm_content')  || ''
      };
    },
    hasCustomParams: function(url) {
      return url.includes('sck=') ||
             (url.includes('utm_source=') && url.includes('xcod=') && url.includes('src='));
    }
  };

  // 3) Processamento de links de pagamento
  function processPaymentLinks() {
    var sel  = 'a[href*="pay.hotmart.com"], a[href*="greenn.com.br"], a[href*="payfast.greenn.com.br"]';
    var slug = location.pathname.replace(/^\//, '').replace(/\/$/, '');
    var u   = utils.getUTMParams();
    var ublk = [u.utm_id, u.utm_source, u.utm_campaign, u.utm_medium, u.utm_content, u.utm_term]
               .filter(Boolean).join('|');
    var xcod = ['mac_id','gac_id','tiktok_id','s_as_id','s_ad_id']
               .map(utils.getURLParam).filter(Boolean).join('|');

    var links = document.querySelectorAll(sel);
    console.log('processPaymentLinks: encontrados', links.length, 'links');
    links.forEach(function(a) {
      var href = a.href;
      if (utils.hasCustomParams(href)) {
        console.log('Link já processado:', href);
        return;
      }
      var sep = href.includes('?') ? '&' : '?';
      var params = href.includes('hotmart.com')
                 ? 'sck=' + ublk + '&xcod=' + xcod + '&src=' + slug
                 : 'utm_source=' + ublk + '&xcod=' + xcod + '&src=' + slug;
      a.href = href + sep + params;
      console.log('Link processado:', a.href);
    });
  }

  // 4) Preenchimento de campos hidden no formulário
  function setupForm() {
    var form = document.querySelector('form');
    if (!form) return;

    function updateHidden() {
      var fullUrl = window.location.href;
      var slug    = location.pathname.replace(/^\//, '').replace(/\/$/, '');
      var utms    = utils.getUTMParams();

      // URL e slug
      var urlField  = document.getElementById('form-field-url');
      var slugField = document.getElementById('form-field-slug');
      if (urlField)  urlField.value  = fullUrl;
      if (slugField) slugField.value = slug;

      // UTMs
      ['utm_source','utm_medium','utm_campaign','utm_id','utm_term','utm_content']
        .forEach(function(key) {
          var el = document.getElementById('form-field-' + key);
          if (el) el.value = utms[key];
        });

      // Outros IDs de campanha
      ['mac_id','gac_id','tiktok_id','s_as_id','s_ad_id']
        .forEach(function(key) {
          var el = document.getElementById('form-field-' + key);
          if (el) el.value = utils.getURLParam(key);
        });

      console.log('updateHidden executed: url=' + fullUrl + ', slug=' + slug);
    }

    form.querySelectorAll('input').forEach(function(input) {
      input.addEventListener('input', updateHidden);
    });
    updateHidden();
  }

  // 5) Inicialização
  onDOMReady(function() {
    console.log('xflow-lite: DOM ready');
    processPaymentLinks();
    setupForm();
  });
})();
