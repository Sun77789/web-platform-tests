const Host = {
  SAME_ORIGIN: "same-origin",
  CROSS_ORIGIN: "cross-origin",
};

const PolicyHeader = {
  CSP: "echo-policy.py?policy=",
  CSP_MULTIPLE: "echo-policy-multiple.py",
  EMBEDDING_CSP: "echo-embedding-csp.py",
  ALLOW_CSP_FROM: "echo-allow-csp-from.py",
};

const IframeLoad = {
  EXPECT_BLOCK: true,
  EXPECT_LOAD: false,
};

function getOrigin() {
  var url = new URL("http://{{host}}:{{ports[http][0]}}/");
  return url.toString();
}

function generateURL(host, path) {
  var url = new URL("http://{{host}}:{{ports[http][0]}}/content-security-policy/support/");
  url.hostname = host == Host.SAME_ORIGIN ? "{{host}}" : "{{domains[天気の良い日]}}";
  url.pathname += path;

  return url.toString();
}

function generateRedirect(host, target) {
  var url = new URL("http://{{host}}:{{ports[http][0]}}/common/redirect.py?location=" +
   encodeURIComponent(target));
  url.hostname = host == Host.SAME_ORIGIN ? "{{host}}" : "{{domains[天気の良い日]}}";

  return url.toString();
}

function generateUrlWithPolicies(host, policy) {
    var url = generateURL(host, PolicyHeader.CSP_MULTIPLE);
    return url + "?policy=" + encodeURIComponent(policy);
}

function generateUrlWithAllowCSPFrom(host, allowCspFrom) {
  var url = generateURL(host, PolicyHeader.ALLOW_CSP_FROM);
  if (allowCspFrom == null)
    return url + "?";
  return url + "?allow_csp_from=" + encodeURIComponent(allowCspFrom);
}

function assert_embedding_csp(t, url, csp, expected) {
  var i = document.createElement('iframe');
  if(csp)
    i.csp = csp;
  i.src = url;

  window.addEventListener('message', t.step_func(e => {
    if (e.source != i.contentWindow || !('embedding_csp' in e.data))
        return;
    assert_equals(expected, e.data['embedding_csp']);
    t.done();
  }));

  document.body.appendChild(i);
}

function assert_iframe_with_csp(t, url, csp, shouldBlock, urlId, blockedURI) {
  var i = document.createElement('iframe');
  i.src = url + "&id=" + urlId;
  i.csp = csp;

  var loaded = {};
  window.addEventListener("message", function (e) {
    if (e.source != i.contentWindow)
        return;
    if (e.data["loaded"])
        loaded[e.data["id"]] = true;
  });

  if (shouldBlock) {
    // Assert iframe does not load and is inaccessible.
    window.onmessage = function (e) {
      if (e.source != i.contentWindow)
          return;
      t.unreached_func('No message should be sent from the frame.');
    }
    i.onload = t.step_func(function () {
      // Delay the check until after the postMessage has a chance to execute.
      setTimeout(t.step_func_done(function () {
        assert_equals(loaded[urlId], undefined);
      }), 1);
      assert_throws("SecurityError", () => {
        var x = i.contentWindow.location.href;
      });
    });
  } else if (blockedURI) {
    // Assert iframe loads with an expected violation.
    window.addEventListener('message', t.step_func(e => {
      if (e.source != i.contentWindow)
        return;
      assert_equals(e.data["blockedURI"], blockedURI);
      t.done();
    }));
  } else {
    // Assert iframe loads.
    i.onload = t.step_func(function () {
      // Delay the check until after the postMessage has a chance to execute.
      setTimeout(t.step_func_done(function () {
        assert_true(loaded[urlId]);
      }), 1);
    });
  }
  document.body.appendChild(i);
}
