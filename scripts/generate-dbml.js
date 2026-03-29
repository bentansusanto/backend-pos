const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../src/modules');
const outputFilePath = path.join(__dirname, '../schema.dbml');

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.entity.ts') || file.endsWith('.entities.ts') || file.endsWith('.enum.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
};

const allRelevantFiles = getAllFiles(modulesDir);
const entities = [];
const relationships = [];
const enums = {};

allRelevantFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Extract Enums
  const enumRegex = /export enum (\w+) {([\s\S]+?)}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody.split(',').map(v => {
      const parts = v.split('=');
      const val = (parts.length > 1 ? parts[1].trim() : parts[0].trim()).split('//')[0].trim();
      return val.replace(/['"]/g, '').replace(/,/g, '').trim();
    }).filter(v => v !== '');
    enums[enumName] = values;
  }

  // Extract Table Name
  const entityMatch = content.match(/@Entity\((?:['"]([^'"]+)['"])?\)/);
  if (!entityMatch) return;
  
  const tableName = entityMatch[1] || path.basename(file, '.entity.ts').replace('.entities', '') + 's';
  const classNameMatch = content.match(/export class (\w+)/);
  const className = classNameMatch ? classNameMatch[1] : tableName;

  const columns = [];
  
  // Extract Columns
  const columnRegex = /@Column\(([\s\S]*?)\)\s*(?:@Exclude\(\)\s*)?(\w+)(?:\?)?\s*:\s*([\s\S]+?);(?=\s*(?:@|export|class|}|@Column|@PrimaryColumn|@CreateDateColumn|@UpdateDateColumn|@DeleteDateColumn|@ManyToOne|@OneToMany|@ManyToMany|@OneToOne|@JoinColumn))/g;
  let match;
  while ((match = columnRegex.exec(content)) !== null) {
    const options = match[1];
    const name = match[2];
    let type = match[3].trim().replace(/\s+/g, ' ');
    
    let dbmlOptions = [];
    if (options.includes('primary: true')) {
      dbmlOptions.push('primary key');
    }
    if (options.includes('unique: true')) {
      dbmlOptions.push('unique');
    }
    if (options.includes('nullable: true')) {
      // dbml default is nullable
    } else {
      dbmlOptions.push('not null');
    }

    columns.push({ name, type, options: dbmlOptions.length > 0 ? ` [${dbmlOptions.join(', ')}]` : '' });
  }

  // Handle PrimaryColumn and Create/Update/DeleteDateColumn separately
  const specialColumnRegex = /@(PrimaryColumn|CreateDateColumn|UpdateDateColumn|DeleteDateColumn)\(([\s\S]*?)\)\s*(\w+)(?:\?)?\s*:\s*([^;]+);/g;
  while ((match = specialColumnRegex.exec(content)) !== null) {
    const decorator = match[1];
    const name = match[3];
    const type = match[4].trim().split(' ')[0];
    
    let dbmlOptions = [];
    if (decorator === 'PrimaryColumn') dbmlOptions.push('primary key');
    if (decorator === 'CreateDateColumn' || decorator === 'UpdateDateColumn' || decorator === 'DeleteDateColumn') {
       dbmlOptions.push('not null');
    }

    columns.push({ name, type, options: dbmlOptions.length > 0 ? ` [${dbmlOptions.join(', ')}]` : '' });
  }

  entities.push({ tableName, columns, className });

  // Extract Relationships
  const relRegex = /@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(\s*(?:\([^)]*\)\s*=>\s*([^,)\s]+)|(['"]([^'"]+)['"]))\s*(?:,\s*([^)]+))?\s*\)\s*(?:@JoinColumn\({?\s*name:\s*['"]([^'"]+)['"]\s*}?\)\s*)?(\w+)\s*:\s*([^;]+);/g;
  
  while ((match = relRegex.exec(content)) !== null) {
    const type = match[1];
    let target = (match[2] || match[4]).trim();
    const fkMatch = content.slice(match.index, match.index + 500).match(/@JoinColumn\(\{\s*name:\s*['"]([^'"]+)['"]/);
    const fkName = fkMatch ? fkMatch[1] : null;

    if (type === 'ManyToOne' && fkName) {
      relationships.push({
        sourceTable: tableName,
        sourceCol: fkName,
        targetTable: target,
        rel: '>'
      });
    }
  }
});

// Map class names to table names
const classToTable = {};
entities.forEach(e => {
  classToTable[e.className] = e.tableName;
});

// Final DBML Generation
let dbml = '// Use dbdiagram.io to visualize this schema\n\n';

// Add Enums
Object.keys(enums).forEach(enumName => {
  dbml += `Enum ${enumName} {\n`;
  enums[enumName].forEach(val => {
    dbml += `  ${val}\n`;
  });
  dbml += '}\n\n';
});

entities.forEach(entity => {
  dbml += `Table ${entity.tableName} {\n`;
  entity.columns.forEach(col => {
    // Escape types if they contain special characters
    const safeType = col.type.includes('{') ? 'json' : col.type;
    dbml += `  ${col.name} ${safeType}${col.options}\n`;
  });
  dbml += '}\n\n';
});

relationships.forEach(rel => {
  const targetTable = classToTable[rel.targetTable] || rel.targetTable.toLowerCase() + 's';
  dbml += `Ref: ${rel.sourceTable}.${rel.sourceCol} > ${targetTable}.id\n`;
});

fs.writeFileSync(outputFilePath, dbml);
console.log(`DBML generated at ${outputFilePath}`);
