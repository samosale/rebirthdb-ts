import { TermJson } from '../internal-types';
import { bracket, termConfig } from './query-config';
import { doTermFunc, runQueryFunc, termBuilder } from './term-builder';

export const querySymbol = Symbol('RebirthDBQuery');

export const isQuery = (query: any) =>
  (typeof query === 'object' || typeof query === 'function') &&
  querySymbol in query;

export function toQuery(term: TermJson) {
  // Using proxy since:
  //  'classes' -
  //    does not support bracket operation
  //    (unless they inherit from Function and it has no access to the surroundings)
  //  'functions' -
  //    require adding all query functions for each new terms or
  //    changing the prototype each time which is a big performance no-no
  const query: any = new Proxy(termBuilder(bracket, term), queryProxyHandler);
  query.term = term;
  return query;
}

const proxyKeys = new Set<PropertyKey>([
  querySymbol,
  'run',
  'do',
  ...termConfig.map(t => t[1])
]);
const queryProxyHandler: ProxyHandler<any> = {
  get(target, p, receiver) {
    // tslint:disable-next-line:no-shadowed-variable
    const { term } = target;
    if (p === 'run') {
      return runQueryFunc(term);
    }
    if (p === 'do') {
      return doTermFunc(receiver);
    }
    const config = termConfig.find(t => t[1] === p);
    if (config) {
      return termBuilder(config, term);
    }
    return target[p];
  },
  has(target, p) {
    return p in target || proxyKeys.has(p);
  }
};