import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(className: string, customName: string): string {
        return customName ? customName : this.toSnakeCase(className);
    }

    columnName(
        propertyName: string,
        customName: string,
        embeddedPrefixes: string[],
    ): string {
        return (
            (embeddedPrefixes.length
                ? embeddedPrefixes.map(p => this.toSnakeCase(p)).join('_') + '_'
                : '') + (customName ? customName : this.toSnakeCase(propertyName))
        );
    }

    relationName(propertyName: string): string {
        return this.toSnakeCase(propertyName);
    }

    joinColumnName(relationName: string, referencedColumnName: string): string {
        return this.toSnakeCase(relationName) + '_' + this.toSnakeCase(referencedColumnName);
    }

    joinTableName(
        firstTableName: string,
        secondTableName: string,
        firstPropertyName: string,
    ): string {
        return this.toSnakeCase(firstTableName) + '_' + this.toSnakeCase(firstPropertyName) + '_' + this.toSnakeCase(secondTableName);
    }

    joinTableColumnName(
        tableName: string,
        propertyName: string,
        columnName?: string,
    ): string {
        return this.toSnakeCase(tableName) + '_' + (columnName ? this.toSnakeCase(columnName) : this.toSnakeCase(propertyName));
    }

    private toSnakeCase(str: string): string {
        return str
            .replace(/([A-Z])/g, (match) => '_' + match.toLowerCase())
            .replace(/^_/, '');
    }
}
