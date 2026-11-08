const BLOCKED_TAGS = 'script,iframe,object,embed,link,meta,style,form,base';

export function sanitizeHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll(BLOCKED_TAGS).forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.replace(/\s/g, '').toLowerCase();
      const isScriptUrl = (attribute.name === 'href' || attribute.name === 'src') && value.startsWith('javascript:');
      if (attribute.name.startsWith('on') || isScriptUrl) element.removeAttribute(attribute.name);
    }
  });
  return template.innerHTML;
}
