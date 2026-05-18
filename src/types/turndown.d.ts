declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
    fence?: string;
    hr?: string;
  }

  interface DomNode {
    nodeName: string;
    nodeType: number;
    data?: string;
    value?: string;
    textContent?: string;
    alt?: string;
    href?: string;
    src?: string;
    isBlock: boolean;
    isVoid: boolean;
    attributes?: NamedNodeMap;
    childNodes?: DomNode[];
    parentNode?: DomNode | null;
    nextSibling?: DomNode | null;
    previousSibling?: DomNode | null;
    getAttribute?(name: string): string | null;
    setAttribute?(name: string, value: string): void;
  }

  type Filter = string | string[] | ((node: DomNode, options: TurndownOptions) => boolean);

  interface Rule {
    filter: Filter;
    replacement: (content: string, node: DomNode, options: TurndownOptions) => string;
  }

  interface Plugin {
    (service: TurndownService): void;
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string): string;
    addRule(key: string, rule: Rule): this;
    keep(filter: Filter): this;
    remove(filter: Filter): this;
    use(plugin: Plugin | Plugin[]): this;
    options: TurndownOptions;
  }

  export default TurndownService;
}
