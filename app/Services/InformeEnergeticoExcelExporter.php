<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Str;

class InformeEnergeticoExcelExporter
{
    public function make(array $payload): array
    {
        $rows = $this->buildRows($payload);
        $baseFilename = $this->buildFilename($payload);

        if (class_exists(\ZipArchive::class)) {
            $xlsx = $this->buildXlsx($rows);

            if ($xlsx !== null) {
                return [
                    'filename' => "{$baseFilename}.xlsx",
                    'content_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'content' => $xlsx,
                ];
            }
        }

        return [
            'filename' => "{$baseFilename}.xml",
            'content_type' => 'application/vnd.ms-excel; charset=UTF-8',
            'content' => $this->buildSpreadsheetXml($rows),
        ];
    }

    private function buildRows(array $payload): array
    {
        $datos = $payload['datos'] ?? [];
        $filtros = $payload['filtros'] ?? [];
        $dispositivo = $payload['dispositivo'] ?? null;
        $organizacion = $payload['organizacion_activa'] ?? [];
        $metricas = $payload['metricas'] ?? [];
        $totales = $this->calculateTotals($datos);
        $metodoPotencia = $this->powerMethodLabel($dispositivo);

        $rows = [
            [$this->cell('Informe energetico', 'header')],
            [],
            [$this->cell('Organizacion', 'header'), $this->cell($organizacion['nombre'] ?? 'Sin organizacion')],
            [$this->cell('Dispositivo', 'header'), $this->cell($dispositivo['nombre'] ?? 'Sin dispositivo')],
            [$this->cell('Fases', 'header'), $this->cell($dispositivo['num_fases'] ?? '')],
            [$this->cell('Periodo', 'header'), $this->cell($this->periodLabel($filtros['periodo'] ?? 'semana_actual'))],
            [$this->cell('Intervalo', 'header'), $this->cell($this->intervalLabel($filtros['intervalo'] ?? '1h'))],
            [$this->cell('Desde', 'header'), $this->cell($filtros['fecha_desde'] ?? '')],
            [$this->cell('Hasta', 'header'), $this->cell($filtros['fecha_hasta'] ?? '')],
            [],
            [$this->cell('Resumen', 'header')],
            [
                $this->cell('Consumo total (kWh)', 'header'),
                $this->cell('Generacion (kWh)', 'header'),
                $this->cell('Importacion (kWh)', 'header'),
                $this->cell('Exportacion (kWh)', 'header'),
                $this->cell('Potencia maxima (kW)', 'header'),
                $this->cell('Potencia promedio (kW)', 'header'),
                $this->cell('Metodo potencia', 'header'),
            ],
            [
                $this->cell($totales['consumo_kwh'], 'number'),
                $this->cell($totales['generacion_kwh'], 'number'),
                $this->cell($totales['importacion_kwh'], 'number'),
                $this->cell($totales['exportacion_kwh'], 'number'),
                $this->cell($metricas['potencia_maxima_kw'] ?? null, 'number'),
                $this->cell($metricas['potencia_promedio_kw'] ?? null, 'number'),
                $this->cell($metodoPotencia),
            ],
            [],
            [
                $this->cell('Fecha', 'header'),
                $this->cell('Consumo (kWh)', 'header'),
                $this->cell('Generacion (kWh)', 'header'),
                $this->cell('Importacion (kWh)', 'header'),
                $this->cell('Exportacion (kWh)', 'header'),
                $this->cell('Potencia media (kW)', 'header'),
                $this->cell('Potencia maxima intervalo (kW)', 'header'),
                $this->cell('Voltaje red (V)', 'header'),
                $this->cell('Voltaje canal 1 (V)', 'header'),
                $this->cell('Voltaje canal 2 (V)', 'header'),
                $this->cell('Voltaje canal 3 (V)', 'header'),
                $this->cell('Q1 (VAR)', 'header'),
                $this->cell('Q2 (VAR)', 'header'),
                $this->cell('Q3 (VAR)', 'header'),
                $this->cell('Q total (VAR)', 'header'),
            ],
        ];

        foreach ($datos as $dato) {
            $rows[] = [
                $this->cell($this->formatDateForExport($dato['fecha'] ?? null, $filtros['intervalo'] ?? '1h')),
                $this->cell($dato['consumo_kwh'] ?? null, 'number'),
                $this->cell($dato['generacion_kwh'] ?? null, 'number'),
                $this->cell($dato['importacion_kwh'] ?? null, 'number'),
                $this->cell($dato['exportacion_kwh'] ?? null, 'number'),
                $this->cell($dato['potencia_promedio_kw'] ?? null, 'number'),
                $this->cell($dato['potencia_maxima_kw'] ?? null, 'number'),
                $this->cell($dato['voltaje_red_electrica'] ?? null, 'number'),
                $this->cell($dato['voltaje_canal_1'] ?? null, 'number'),
                $this->cell($dato['voltaje_canal_2'] ?? null, 'number'),
                $this->cell($dato['voltaje_canal_3'] ?? null, 'number'),
                $this->cell($dato['q1_var'] ?? null, 'number'),
                $this->cell($dato['q2_var'] ?? null, 'number'),
                $this->cell($dato['q3_var'] ?? null, 'number'),
                $this->cell($dato['q_total_var'] ?? null, 'number'),
            ];
        }

        return $rows;
    }

    private function powerMethodLabel(?array $dispositivo): string
    {
        if (($dispositivo['num_fases'] ?? null) === 3) {
            return 'Suma trifasica de canales';
        }

        return 'Canal con mayor potencia';
    }

    private function calculateTotals(array $datos): array
    {
        $totales = [
            'consumo_kwh' => 0.0,
            'generacion_kwh' => 0.0,
            'importacion_kwh' => 0.0,
            'exportacion_kwh' => 0.0,
        ];

        foreach ($datos as $dato) {
            $totales['consumo_kwh'] += (float) ($dato['consumo_kwh'] ?? 0);
            $totales['generacion_kwh'] += (float) ($dato['generacion_kwh'] ?? 0);
            $totales['importacion_kwh'] += (float) ($dato['importacion_kwh'] ?? 0);
            $totales['exportacion_kwh'] += (float) ($dato['exportacion_kwh'] ?? 0);
        }

        return array_map(
            static fn (float $value) => round($value, 3),
            $totales
        );
    }

    private function buildFilename(array $payload): string
    {
        $nombreDispositivo = Str::slug($payload['dispositivo']['nombre'] ?? 'sin-dispositivo');
        $fechaDesde = $payload['filtros']['fecha_desde'] ?? now()->format('Y-m-d');
        $fechaHasta = $payload['filtros']['fecha_hasta'] ?? now()->format('Y-m-d');

        return "informe-energetico-{$nombreDispositivo}-{$fechaDesde}-{$fechaHasta}";
    }

    private function buildXlsx(array $rows): ?string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'informe_excel_');

        if ($tempFile === false) {
            return null;
        }

        $zip = new \ZipArchive();
        $result = $zip->open($tempFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        if ($result !== true) {
            @unlink($tempFile);

            return null;
        }

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
        $zip->addFromString('_rels/.rels', $this->rootRelationshipsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelationshipsXml());
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->worksheetXml($rows));

        $zip->close();

        $content = file_get_contents($tempFile);
        @unlink($tempFile);

        return $content === false ? null : $content;
    }

    private function buildSpreadsheetXml(array $rows): string
    {
        $worksheetRows = '';

        foreach ($rows as $row) {
            $worksheetRows .= '<Row>';

            foreach ($row as $cell) {
                $worksheetRows .= $this->spreadsheetXmlCell($cell);
            }

            $worksheetRows .= '</Row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="Number">
   <NumberFormat ss:Format="0.000"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Informe">
  <Table>
{$worksheetRows}
  </Table>
 </Worksheet>
</Workbook>
XML;
    }

    private function worksheetXml(array $rows): string
    {
        $columnCount = max(array_map(static fn (array $row) => count($row), $rows));
        $lastCell = $this->columnLetter(max(1, $columnCount)) . count($rows);
        $sheetRows = '';

        foreach ($rows as $rowIndex => $row) {
            $sheetRows .= '<row r="' . ($rowIndex + 1) . '">';

            foreach ($row as $cellIndex => $cell) {
                $sheetRows .= $this->xlsxCell($cell, $rowIndex + 1, $cellIndex + 1);
            }

            $sheetRows .= '</row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:{$lastCell}"/>
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>
    {$sheetRows}
  </sheetData>
</worksheet>
XML;
    }

    private function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
XML;
    }

    private function rootRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
XML;
    }

    private function workbookXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>
  </bookViews>
  <sheets>
    <sheet name="Informe" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
XML;
    }

    private function workbookRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
XML;
    }

    private function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>
XML;
    }

    private function xlsxCell(array $cell, int $rowIndex, int $columnIndex): string
    {
        $reference = $this->columnLetter($columnIndex) . $rowIndex;
        $value = $cell['value'];
        $style = $cell['style'] ?? 'default';

        if ($value === null || $value === '') {
            return '<c r="' . $reference . '"/>';
        }

        if ($style === 'number' && is_numeric($value)) {
            return '<c r="' . $reference . '" s="2"><v>' . $this->escapeNumber($value) . '</v></c>';
        }

        $styleId = $style === 'header' ? ' s="1"' : '';

        return '<c r="' . $reference . '"' . $styleId . ' t="inlineStr"><is><t>' .
            $this->escapeXml((string) $value) .
            '</t></is></c>';
    }

    private function spreadsheetXmlCell(array $cell): string
    {
        $value = $cell['value'];
        $style = $cell['style'] ?? 'default';

        if ($value === null || $value === '') {
            return '<Cell/>';
        }

        if ($style === 'number' && is_numeric($value)) {
            return '<Cell ss:StyleID="Number"><Data ss:Type="Number">' .
                $this->escapeNumber($value) .
                '</Data></Cell>';
        }

        $styleId = $style === 'header' ? 'Header' : 'Default';

        return '<Cell ss:StyleID="' . $styleId . '"><Data ss:Type="String">' .
            $this->escapeXml((string) $value) .
            '</Data></Cell>';
    }

    private function formatDateForExport(?string $fecha, string $intervalo): string
    {
        if (! $fecha) {
            return '';
        }

        $formato = $intervalo === '1d' ? 'd/m/Y' : 'd/m/Y H:i';

        return Carbon::parse($fecha)
            ->timezone(config('app.timezone'))
            ->format($formato);
    }

    private function periodLabel(string $periodo): string
    {
        return match ($periodo) {
            'semana_actual' => 'Semana actual',
            'semana_pasada' => 'Semana pasada',
            'mes_actual' => 'Mes actual',
            'mes_anterior' => 'Mes anterior',
            'personalizado' => 'Personalizado',
            default => Str::headline($periodo),
        };
    }

    private function intervalLabel(string $intervalo): string
    {
        return match ($intervalo) {
            '15m' => '15 minutos',
            '1h' => '1 hora',
            '1d' => '1 dia',
            '1sem' => '1 semana',
            '1mes' => '1 mes',
            default => $intervalo,
        };
    }

    private function columnLetter(int $columnNumber): string
    {
        $letter = '';

        while ($columnNumber > 0) {
            $modulo = ($columnNumber - 1) % 26;
            $letter = chr(65 + $modulo) . $letter;
            $columnNumber = intdiv($columnNumber - $modulo - 1, 26);
        }

        return $letter;
    }

    private function cell(mixed $value, string $style = 'default'): array
    {
        return [
            'value' => $value,
            'style' => $style,
        ];
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function escapeNumber(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 3, '.', ''), '0'), '.');
    }
}
