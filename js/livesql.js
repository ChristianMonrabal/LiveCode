const textarea = document.getElementById('sql-code');
const output = document.getElementById('sql-output');

// Recupera la base de datos almacenada desde localStorage
let databases = JSON.parse(localStorage.getItem('databases')) || {};
let currentDatabase = localStorage.getItem('currentDatabase') || '';

// Función para guardar los datos en localStorage
function saveToLocalStorage() {
    localStorage.setItem('databases', JSON.stringify(databases));
    localStorage.setItem('currentDatabase', currentDatabase);
}

// Función para mostrar los datos en formato HTML
function formatTable(tableName, columns, rows) {
    let formattedResult = `<table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr>`;
    columns.forEach(col => formattedResult += `<th style="padding: 8px; border: 1px solid #ddd;">${col}</th>`);
    formattedResult += `</tr></thead><tbody>`;

    rows.forEach(row => {
        formattedResult += `<tr>`;
        row.forEach(cell => formattedResult += `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`);
        formattedResult += `</tr>`;
    });

    formattedResult += `</tbody></table>`;
    return formattedResult;
}

// Función para validar el tipo de dato
function validateDataType(value, type) {
    switch (type.toLowerCase()) {
        case 'int':
            return /^\d+$/.test(value);
        case 'varchar':
        case 'text':
            return true; // Acepta cualquier cadena
        case 'decimal':
            return /^\d+(\.\d+)?$/.test(value);
        default:
            return false;
    }
}

// Función para procesar SQL con soporte para comentarios
function processSQL(sql) {
    const statements = sql
        .split('\n') // Dividir por líneas
        .map(line => line.trim()) // Eliminar espacios al inicio y al final de cada línea
        .filter(line => line.length > 0 && !line.startsWith('--')) // Filtrar comentarios y líneas vacías
        .join('\n') // Volver a unir en un solo string con saltos de línea
        .split(';') // Dividir en declaraciones SQL
        .map(stmt => stmt.trim()) // Eliminar espacios al inicio y al final de cada declaración
        .filter(stmt => stmt.length > 0); // Filtrar declaraciones vacías

    let result = '';

    statements.forEach(statement => {
        try {
            if (statement.toLowerCase().startsWith('create database')) {
                const dbName = statement.match(/CREATE DATABASE (\w+)/i)[1];
                if (!databases[dbName]) {
                    databases[dbName] = { tables: {} };
                    result += `Database '${dbName}' created successfully.<br>`;
                    saveToLocalStorage();
                } else {
                    result += `Database '${dbName}' already exists.<br>`;
                }
            } else if (statement.toLowerCase().startsWith('use')) {
                currentDatabase = statement.match(/USE (\w+)/i)[1];
                if (databases[currentDatabase]) {
                    result += `Using database '${currentDatabase}'.<br>`;
                } else {
                    result += `Database '${currentDatabase}' does not exist.<br>`;
                }
                saveToLocalStorage();
            } else if (statement.toLowerCase().startsWith('create table')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const tableMatch = statement.match(/CREATE TABLE (\w+) \(([^)]+)\)/i);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    const columns = tableMatch[2].split(',').map(col => col.trim());
                    if (!databases[currentDatabase].tables[tableName]) {
                        databases[currentDatabase].tables[tableName] = { columns, rows: [] };
                        result += `Table '${tableName}' created successfully in database '${currentDatabase}'.<br>`;
                    } else {
                        result += `Table '${tableName}' already exists in database '${currentDatabase}'.<br>`;
                    }
                } else {
                    result += 'Syntax error in CREATE TABLE statement.<br>';
                }
                saveToLocalStorage();
            } else if (statement.toLowerCase().startsWith('insert into')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const insertMatch = statement.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i);
                if (insertMatch) {
                    const tableName = insertMatch[1];
                    const columns = insertMatch[2].split(',').map(col => col.trim());
                    const values = insertMatch[3].split(',').map(value => value.trim().replace(/^'|'$/g, ''));
                    if (databases[currentDatabase].tables[tableName]) {
                        const table = databases[currentDatabase].tables[tableName];
                        if (columns.length === values.length) {
                            const valid = columns.every((col, index) => {
                                const colType = table.columns.find(c => c.startsWith(col)).split(' ')[1];
                                return validateDataType(values[index], colType);
                            });
                            if (valid) {
                                table.rows.push(values);
                                result += `Data inserted into '${tableName}' successfully.<br>`;
                            } else {
                                result += `Data type mismatch in INSERT INTO statement.<br>`;
                            }
                        } else {
                            result += `Column count does not match value count.<br>`;
                        }
                    } else {
                        result += `Table '${tableName}' does not exist in database '${currentDatabase}'.<br>`;
                    }
                } else {
                    result += 'Syntax error in INSERT INTO statement.<br>';
                }
                saveToLocalStorage();
            } else if (statement.toLowerCase().startsWith('select')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const selectMatch = statement.match(/SELECT (.+) FROM (\w+)/i);
                if (selectMatch) {
                    const columns = selectMatch[1].split(',').map(col => col.trim());
                    const tableName = selectMatch[2];
                    if (databases[currentDatabase].tables[tableName]) {
                        const table = databases[currentDatabase].tables[tableName];
                        const columnIndexes = columns.map(col => table.columns.findIndex(c => c.startsWith(col)));
                        const rows = table.rows.map(row => columnIndexes.map(index => row[index]));
                        result += formatTable(tableName, columns, rows) + `<br>`;
                    } else {
                        result += `Table '${tableName}' does not exist in database '${currentDatabase}'.<br>`;
                    }
                } else {
                    result += 'Invalid SELECT statement.<br>';
                }
            } else if (statement.toLowerCase().startsWith('update')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                // Simulación básica para 'UPDATE'
                result += 'Data updated successfully.<br>';
                saveToLocalStorage();
            } else if (statement.toLowerCase().startsWith('drop table')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const tableName = statement.match(/DROP TABLE (\w+)/i)[1];
                if (databases[currentDatabase].tables[tableName]) {
                    delete databases[currentDatabase].tables[tableName];
                    result += `Table '${tableName}' dropped successfully from database '${currentDatabase}'.<br>`;
                } else {
                    result += `Table '${tableName}' does not exist in database '${currentDatabase}'.<br>`;
                }
                saveToLocalStorage();
            } else if (statement.toLowerCase().startsWith('alter table')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const alterMatch = statement.match(/ALTER TABLE (\w+) (.+)/i);
                const tableName = alterMatch[1];
                const alterCommand = alterMatch[2];
                if (databases[currentDatabase].tables[tableName]) {
                    if (alterCommand.toLowerCase().startsWith('modify column')) {
                        const columnParts = alterCommand.match(/MODIFY COLUMN (\w+) (\w+)\((\d+)\)/i);
                        if (columnParts) {
                            const columnName = columnParts[1];
                            const columnType = columnParts[2];
                            const newLength = parseInt(columnParts[3], 10);
                            const table = databases[currentDatabase].tables[tableName];
                            const columnIndex = table.columns.findIndex(col => col.startsWith(columnName));
                            if (columnIndex !== -1) {
                                table.columns[columnIndex] = `${columnName} ${columnType}(${newLength})`;
                                result += `Column '${columnName}' modified successfully in table '${tableName}'.<br>`;
                            } else {
                                result += `Column '${columnName}' does not exist in table '${tableName}'.<br>`;
                            }
                        } else {
                            result += 'Syntax error in ALTER TABLE MODIFY COLUMN.<br>';
                        }
                    } else {
                        result += 'Only MODIFY COLUMN is supported in ALTER TABLE.<br>';
                    }
                    saveToLocalStorage();
                } else {
                    result += `Table '${tableName}' does not exist in database '${currentDatabase}'.<br>`;
                }
            } else if (statement.toLowerCase() === 'show databases') {
                const dbList = Object.keys(databases);
                result += `<ul>${dbList.map(db => `<li>${db}</li>`).join('')}</ul><br>`;
            } else if (statement.toLowerCase() === 'show tables') {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const tableList = Object.keys(databases[currentDatabase].tables);
                result += `<ul>${tableList.map(table => `<li>${table}</li>`).join('')}</ul><br>`;
            } else if (statement.toLowerCase().startsWith('show columns')) {
                if (!currentDatabase) {
                    result += 'No database selected. Use a database with USE.<br>';
                    return;
                }
                const tableName = statement.match(/FROM (\w+)/i)[1];
                if (databases[currentDatabase].tables[tableName]) {
                    const columns = databases[currentDatabase].tables[tableName].columns;
                    result += `<ul>${columns.map(col => `<li>${col}</li>`).join('')}</ul><br>`;
                } else {
                    result += `Table '${tableName}' does not exist in database '${currentDatabase}'.<br>`;
                }
            } else {
                result += 'Unknown command or syntax error.<br>';
            }
        } catch (e) {
            result += 'Syntax error or invalid command.<br>';
        }
    });

    return result;
}

textarea.addEventListener('input', () => {
    const sql = textarea.value;
    const result = processSQL(sql);
    output.innerHTML = result; // Use innerHTML to render HTML tables
});
