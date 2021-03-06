// 15 passing (16s)
// 2 failing
import assert from 'assert';
import { r } from '../src';
import config from './config';
import { uuid } from './util/common';

describe('manipulating tables', () => {
  let dbName;

  before(async () => {
    await r.connectPool(config);
    dbName = uuid(); // export to the global scope
    const result = await r.dbCreate(dbName).run();
    assert.equal(result.dbs_created, 1);
  });

  after(async () => {
    await r.getPoolMaster().drain();
  });

  it('`tableList` should return a cursor', async () => {
    const result = await r
      .db(dbName)
      .tableList()
      .run();
    assert(Array.isArray(result));
  });

  it('`tableList` should show the table we created', async () => {
    const tableName = uuid(); // export to the global scope

    let result = await r
      .db(dbName)
      .tableCreate(tableName)
      .run();
    assert.equal(result.tables_created, 1);

    result = await r
      .db(dbName)
      .tableList()
      .run();
    assert(Array.isArray(result));
    assert.equal(tableName, result.find(name => name === tableName));
  });

  it('`tableCreate` should create a table', async () => {
    const tableName = uuid(); // export to the global scope

    const result = await r
      .db(dbName)
      .tableCreate(tableName)
      .run();
    assert.equal(result.tables_created, 1);
  });

  it('`tableCreate` should create a table -- primaryKey', async () => {
    const tableName = uuid();

    let result = await r
      .db(dbName)
      .tableCreate(tableName, { primaryKey: 'foo' })
      .run();
    assert.equal(result.tables_created, 1);

    result = await r
      .db(dbName)
      .table(tableName)
      .info()
      .run();
    assert(result.primary_key, 'foo');
  });

  it('`tableCreate` should create a table -- all args', async () => {
    const tableName = uuid();

    let result = await r
      .db(dbName)
      .tableCreate(tableName, { durability: 'soft', primaryKey: 'foo' })
      .run();
    assert.equal(result.tables_created, 1); // We can't really check other parameters...

    result = await r
      .db(dbName)
      .table(tableName)
      .info()
      .run();
    assert(result.primary_key, 'foo');
  });

  it('`tableCreate` should throw -- non valid args', async () => {
    try {
      const tableName = uuid();

      await r
        .db(dbName)
        .tableCreate(tableName, { nonValidArg: true })
        .run();
      assert.fail('should throw');
    } catch (e) {
      assert(
        e.message.startsWith(
          'Unrecognized optional argument `non_valid_arg` in'
        )
      );
    }
  });

  it('`tableCreate` should throw if no argument is given', async () => {
    try {
      await r
        .db(dbName)
        .tableCreate()
        .run();
      assert.fail('should throw');
    } catch (e) {
      assert.equal(
        e.message,
        '`tableCreate` takes at least 1 argument, 0 provided after:\nr.db("' +
          dbName +
          '")\n'
      );
    }
  });

  it('`tableCreate` should throw is the name contains special char', async () => {
    try {
      await r
        .db(dbName)
        .tableCreate('-_-')
        .run();
    } catch (e) {
      assert(
        e.message.match(/Table name `-_-` invalid \(Use A-Za-z0-9_ only\)/)
      );
    }
  });

  it('`tableDrop` should drop a table', async () => {
    const tableName = uuid();

    let result = await r
      .db(dbName)
      .tableCreate(tableName)
      .run();
    assert.equal(result.tables_created, 1);

    result = await r
      .db(dbName)
      .tableList()
      .run();
    assert(Array.isArray(result));
    assert.equal(result.find(name => name === tableName), tableName);

    result = await r
      .db(dbName)
      .tableDrop(tableName)
      .run();
    assert.equal(result.tables_dropped, 1);

    result = await r
      .db(dbName)
      .tableList()
      .run();
    assert(result.find(name => name === tableName) === undefined);
  });

  it('`tableDrop` should throw if no argument is given', async () => {
    try {
      await r
        .db(dbName)
        .tableDrop()
        .run();
      assert.fail('should throw');
    } catch (e) {
      assert.equal(
        e.message,
        '`tableDrop` takes 1 argument, 0 provided after:\nr.db("' +
          dbName +
          '")\n'
      );
    }
  });

  describe('indices', () => {
    const dbName = uuid();
    const tableName = uuid();

    before(async () => {
      let result = await r.dbCreate(dbName).run();
      assert.equal(result.dbs_created, 1);

      result = await r
        .db(dbName)
        .tableCreate(tableName)
        .run();
      assert.equal(result.tables_created, 1);
    });

    it('index operations', async () => {
      let result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate('newField')
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexList()
        .run();
      assert.deepEqual(result, ['newField']);

      result = await r
        .db(dbName)
        .table(tableName)
        .indexWait()
        .pluck('index', 'ready')
        .run();
      assert.deepEqual(result, [{ index: 'newField', ready: true }]);
      result = await r
        .db(dbName)
        .table(tableName)
        .indexStatus()
        .pluck('index', 'ready')
        .run();
      assert.deepEqual(result, [{ index: 'newField', ready: true }]);

      result = await r
        .db(dbName)
        .table(tableName)
        .indexDrop('newField')
        .run();
      assert.deepEqual(result, { dropped: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate('field1', function(doc) {
          return doc('field1');
        })
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexWait('field1')
        .pluck('index', 'ready')
        .run();
      assert.deepEqual(result, [{ index: 'field1', ready: true }]);
      result = await r
        .db(dbName)
        .table(tableName)
        .indexStatus('field1')
        .pluck('index', 'ready')
        .run();
      assert.deepEqual(result, [{ index: 'field1', ready: true }]);

      result = await r
        .db(dbName)
        .table(tableName)
        .indexDrop('field1')
        .run();
      assert.deepEqual(result, { dropped: 1 });
    });

    it('`indexCreate` should work with options', async () => {
      let result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate('foo', { multi: true })
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate('foo1', row => row('foo'), { multi: true })
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate(
          'foo2',
          function(doc) {
            return doc('foo');
          },
          { multi: true }
        )
        .run();
      assert.deepEqual(result, { created: 1 });

      await r
        .db(dbName)
        .table(tableName)
        .indexWait()
        .run();

      result = await r
        .db(dbName)
        .table(tableName)
        .insert({ foo: ['bar1', 'bar2'], buzz: 1 })
        .run();
      assert.equal(result.inserted, 1);

      result = await r
        .db(dbName)
        .table(tableName)
        .insert({ foo: ['bar1', 'bar3'], buzz: 2 })
        .run();
      assert.equal(result.inserted, 1);

      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar1', { index: 'foo' })
        .count()
        .run();
      assert.equal(result, 2);

      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar1', { index: 'foo1' })
        .count()
        .run();
      assert.equal(result, 2);
      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar1', { index: 'foo2' })
        .count()
        .run();
      assert.equal(result, 2);

      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar2', { index: 'foo' })
        .count()
        .run();
      assert.equal(result, 1);
      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar2', { index: 'foo1' })
        .count()
        .run();
      assert.equal(result, 1);
      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar2', { index: 'foo2' })
        .count()
        .run();
      assert.equal(result, 1);

      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar3', { index: 'foo' })
        .count()
        .run();
      assert.equal(result, 1);
      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar3', { index: 'foo1' })
        .count()
        .run();
      assert.equal(result, 1);
      result = await r
        .db(dbName)
        .table(tableName)
        .getAll('bar3', { index: 'foo2' })
        .count()
        .run();
      assert.equal(result, 1);

      // Test when the function is wrapped in an array
      result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate('buzz', row => [row('buzz')])
        .run();
      assert.deepEqual(result, { created: 1 });

      await r
        .db(dbName)
        .table(tableName)
        .indexWait()
        .run();

      result = await r
        .db(dbName)
        .table(tableName)
        .getAll([1], { index: 'buzz' })
        .count()
        .run();
      assert.equal(result, 1);
    });

    it('`indexCreate` should throw if no argument is passed', async () => {
      try {
        await r
          .db(dbName)
          .table(tableName)
          .indexCreate()
          .run();
        assert.fail('should throw');
      } catch (e) {
        assert.equal(
          e.message,
          '`indexCreate` takes at least 1 argument, 0 provided after:\nr.db("' +
            dbName +
            '").table("' +
            tableName +
            '")\n'
        );
      }
    });

    it('`indexDrop` should throw if no argument is passed', async () => {
      try {
        await r
          .db(dbName)
          .table(tableName)
          .indexDrop()
          .run();
        assert.fail('should throw');
      } catch (e) {
        assert.equal(
          e.message,
          '`indexDrop` takes 1 argument, 0 provided after:\nr.db("' +
            dbName +
            '").table("' +
            tableName +
            '")\n'
        );
      }
    });

    it('`indexRename` should work', async () => {
      const toRename = uuid();
      const renamed = uuid();
      const existing = uuid();

      let result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate(toRename)
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexRename(toRename, renamed)
        .run();
      assert.deepEqual(result, { renamed: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexCreate(existing)
        .run();
      assert.deepEqual(result, { created: 1 });

      result = await r
        .db(dbName)
        .table(tableName)
        .indexRename(renamed, existing, { overwrite: true })
        .run();
      assert.deepEqual(result, { renamed: 1 });
    });

    it('`indexRename` should not overwrite an index if not specified', async () => {
      try {
        const name = uuid();
        const otherName = uuid();

        let result = await r
          .db(dbName)
          .table(tableName)
          .indexCreate(name)
          .run();
        assert.deepEqual(result, { created: 1 });

        result = await r
          .db(dbName)
          .table(tableName)
          .indexCreate(otherName)
          .run();
        assert.deepEqual(result, { created: 1 });

        await r
          .db(dbName)
          .table(tableName)
          .indexRename(otherName, name)
          .run();
        assert.fail('should throw');
      } catch (e) {
        assert(e.message.match(/^Index `.*` already exists on table/));
      }
    });

    it('`indexRename` should throw -- non valid args', async () => {
      try {
        await r
          .db(dbName)
          .table(tableName)
          .indexRename('foo', 'bar', { nonValidArg: true })
          .run();
        assert.fail('should throw');
      } catch (e) {
        assert(
          e.message.startsWith(
            'Unrecognized optional argument `non_valid_arg` in'
          )
        );
      }
    });
  });
});
