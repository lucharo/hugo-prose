(function(d) {
  // implement some features for articles: sidenotes, number_sections, toc

  var config = [], toc_title = "Contents", isArray = function(x) {
    return x instanceof Array;
  };
  if (d.currentScript) {
    config = d.currentScript.dataset['pageFeatures'];
    config = config ? JSON.parse(config) : [];
    var c1 = config[0], c2 = config[1];  // local to override global config
    if (!isArray(c1)) c1 = [];
    if (!isArray(c2)) c2 = [];
    if (c1.length > 0) c2.forEach(function(x) {
      x1 = x.replace(/^[+-]/, '');
      var found = false;
      c1.forEach(function(x2) {
        if (found) return;
        found = x2.replace('/^[+-]/', '') == x1;
      });
      !found && c1.push(x);
    });
    c3 = config[2];  // toc title
    if (c3) toc_title = c3;
    config = c1;
  }

  var removeEl = function(el) {
    if (!el) return;
    el.remove ? el.remove() : el.parentNode.removeChild(el);
  };

  var insertAfter = function(prev, sib) {
    prev.after ? prev.after(sib) : (
      prev.parentNode.insertBefore(sib, prev.nextSibling)
    );
  };

  var i, a, s;

  // process single articles
  var article = d.querySelector('main .article');
  if (!article) article = d.createElement('div');

  // move <figcaption> out of <figure> (and p.caption out of div.figure) so that <figure> can scroll
  d.querySelectorAll('.fullscroll figure > figcaption, .fullscroll .figure > .caption').forEach(function(el) {
    insertAfter(el.parentNode, el);
  });

  // move footnotes and citations to sidenotes
  if (config.indexOf('-sidenotes') === -1) {
    d.querySelectorAll('.footnotes > ol > li[id^="fn"], #refs > div[id^="ref-"]').forEach(function(fn) {
      a = d.querySelectorAll('a[href="#' + fn.id + '"]');  // <a> that points to note id in body
      if (a.length === 0) return;
      a.forEach(function(el) { el.removeAttribute('href') });
      a = a[0];
      s = d.createElement('div');  // insert a side div next to n in body
      s.className = 'side side-right';
      if (/^fn/.test(fn.id)) {
        s.innerHTML = fn.innerHTML;
        var n = a.innerText;   // footnote number
        s.firstElementChild.innerHTML = '<span class="bg-number">' + n +
          '</span> ' + s.firstElementChild.innerHTML;
        removeEl(s.querySelector('a[href^="#fnref"]'));  // remove backreference
        // insert note after the <sup> or <span> that contains a
        insertAfter(a.parentNode.tagName === 'SUP' ? a.parentNode : a, s);
      } else {
        s.innerHTML = fn.outerHTML;
        insertAfter(a.parentNode, s);
      }
      removeEl(fn);
    });
    // remove the footnote/citation section if it's empty now
    d.querySelectorAll('.footnotes, #refs').forEach(function(fn) {
      var items = fn.children;
      if (fn.id === 'refs') return items.length === 0 && removeEl(fn);
      // there must be a <hr> and an <ol> left
      if (items.length !== 2 || items[0].tagName !== 'HR' || items[1].tagName !== 'OL') return;
      items[1].childElementCount === 0 && removeEl(fn);
    });
  }

  // header level: <hN> -> N
  var level = function(x) {
    return parseInt(x.replace(/^h/i, ''));
  };
  // number sections (need to skip headers in TOC)
  var h, hs = article.querySelectorAll('h1, :not(#TOC) > h2, h3, h4, h5, h6'), t0 = 0, t1,
    dict = [0, 0, 0, 0, 0, 0];
  // generate section numbers x.x.x
  var number_section = function(i) {
    dict[i]++;
    return dict.filter(function(d) {return d != 0;}).join('.') + ' ';
  };
  // whether a string contains a leading section number x.x.x
  var has_number = function(x) {
    return /^[0-9]+[.0-9]* /.test(x);
  };
  // have sections been already numbered?
  var numbered;
  numbered = config.indexOf('+number_sections') >= 0 ? false : (
    config.indexOf('-number_sections') >= 0 ? true :
      article.querySelector('span.header-section-number')
  );
  if (!numbered) for (i = 0; i < hs.length; i++) {
    h = hs[i];
    numbered = has_number(h.innerText);
    if (numbered) break;
  }
  if (!numbered) hs.forEach(function(h) {
    t1 = level(h.tagName);
    if (t1 < t0) {
      for (var j = t1; j < dict.length; j++) {
        dict[j] = 0;
      }
    }
    h.insertBefore(d.createTextNode(number_section(t1 - 1)), h.firstChild);
    t0 = t1;
  });

  // build TOC
  var toc = article.querySelector('#TOC');
  removeEl(toc);  // delete and rebuild TOC if it has been generated (by Pandoc)
  var build_toc = config.indexOf('+toc') >= 0 || config.indexOf('-toc') === -1;
  toc = d.createElement('div');
  if (build_toc) {
    var li, ul;
    var p = toc;  // the current parent in which we insert child TOC items
    toc.id = 'TOC';
    t0 = 0;  // pretend there is a top-level <h0> for the sake of convenience
    hs.forEach(function(h) {
      t1 = level(h.tagName);
      li = d.createElement('li');
      if (t1 > t0) {
        // lower-level header: create a new ul
        ul = d.createElement('ul');
        ul.appendChild(li);
        p.appendChild(ul);
      } else if (t1 < t0) {
        // higher-level header: go back to upper-level ul
        for (var j = 0; j < t0 - t1; j++) {
          p = p.parentNode.parentNode;
        }
      }
      if (t1 <= t0) p.parentNode.appendChild(li);
      p = li;
      a = d.createElement('a');
      a.innerText = h.innerText;
      if (h.id) {
        a.href = '#' + h.id;
      } else {
        s = h.parentNode;
        if (s.classList.contains('section') && s.id) a.href = '#' + s.id;
      }
      p.appendChild(a);
      t0 = t1;
    });
    hs.length && article.insertBefore(toc, article.firstChild);
  }
  toc = article.querySelector('#TOC');
  if (toc) {
    var t = toc.firstElementChild;
    if (t && !/^H[1-6]$/.test(t.tagName)) {
      var h = d.createElement('h2'); h.innerText = toc_title;
      toc.insertBefore(h, t);
    }
    toc.className = 'side side-left';
    toc.querySelectorAll('ul > li').forEach(function(p) {
      has_number(p.innerText) && p.parentNode.classList.add('numbered');
    });
  }

  // make the top menu sticky
  if (config.indexOf('-sticky_menu') === -1 && config.indexOf('+sticky_menu') >= 0) {
    s = d.querySelector('.menu');
    if (s) {
      s.classList.add('sticky-top');
      var toc = article.querySelector('#TOC');
      if (toc) toc.style.top = s.offsetHeight + 'px';  // make sure menu won't cover TOC
    }
  }
})(document);
