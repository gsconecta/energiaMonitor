<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

final class SchemaContract
{
    public static function capture(): array
    {
        return self::normalize([
            'columns' => DB::select('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION'),
            'indexes' => DB::select('SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX'),
            'foreign_keys' => DB::select('SELECT k.TABLE_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.TABLE_NAME=r.TABLE_NAME AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME,k.COLUMN_NAME'),
        ]);
    }

    public static function normalize(array $metadata): array
    {
        $schema = [];
        foreach ($metadata['columns'] as $column) {
            $column = (array) $column;
            if ($column['TABLE_NAME'] === 'migrations') {
                continue;
            }
            $schema[$column['TABLE_NAME']]['columns'][$column['COLUMN_NAME']] = [
                'type' => $column['COLUMN_TYPE'],
                'nullable' => $column['IS_NULLABLE'] === 'YES',
                'default' => $column['COLUMN_DEFAULT'] === 'NULL' ? null : $column['COLUMN_DEFAULT'],
                'extra' => $column['EXTRA'],
            ];
        }
        $indexes = [];
        foreach ($metadata['indexes'] as $index) {
            $index = (array) $index;
            if ($index['TABLE_NAME'] === 'migrations') {
                continue;
            }
            $key = $index['TABLE_NAME'].'.'.$index['INDEX_NAME'];
            $indexes[$key]['table'] = $index['TABLE_NAME'];
            $indexes[$key]['unique'] = ! $index['NON_UNIQUE'];
            $indexes[$key]['columns'][(int) $index['SEQ_IN_INDEX']] = $index['COLUMN_NAME'];
        }
        foreach ($indexes as $index) {
            ksort($index['columns']);
            $schema[$index['table']]['indexes'][] = ['unique' => $index['unique'], 'columns' => array_values($index['columns'])];
        }
        foreach ($metadata['foreign_keys'] as $fk) {
            $fk = (array) $fk;
            $schema[$fk['TABLE_NAME']]['foreign_keys'][$fk['COLUMN_NAME']] = [
                'table' => $fk['REFERENCED_TABLE_NAME'], 'column' => $fk['REFERENCED_COLUMN_NAME'],
                'delete' => $fk['DELETE_RULE'], 'update' => $fk['UPDATE_RULE'],
            ];
        }
        foreach ($schema as &$table) {
            ksort($table['columns']);
            usort($table['indexes'], fn ($a, $b) => json_encode($a) <=> json_encode($b));
            $table['foreign_keys'] ??= [];
            ksort($table['foreign_keys']);
        }
        ksort($schema);

        return $schema;
    }
}
