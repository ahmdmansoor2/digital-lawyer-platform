using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace MdToDocx;

/// <summary>
/// Converts Arabic Markdown to a properly formatted .docx file.
/// Supports: headings, paragraphs, tables, lists, blockquotes, horizontal rules,
/// bold/italic inline, and RTL (right-to-left) for Arabic text.
/// </summary>
public static class Program
{
    // RTL languages: Arabic, Hebrew, Persian, Urdu
    private static readonly Regex RtlRunRegex = new(@"[؀-ۿﹰ-‍]+", RegexOptions.Compiled);

    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: md2docx <input.md> <output.docx> [--title=<title>] [--author=<author>]");
            return 1;
        }

        var inputPath = args[0];
        var outputPath = args[1];
        string? title = null;
        string? author = null;
        foreach (var arg in args.Skip(2))
        {
            if (arg.StartsWith("--title=")) title = arg[8..];
            else if (arg.StartsWith("--author=")) author = arg[9..];
        }

        if (!File.Exists(inputPath))
        {
            Console.Error.WriteLine($"Input file not found: {inputPath}");
            return 1;
        }

        var md = File.ReadAllText(inputPath, Encoding.UTF8);
        MarkdownToDocx.ConvertToFile(md, outputPath, title, author);
        Console.WriteLine($"Created: {outputPath} ({new FileInfo(outputPath).Length / 1024} KB)");
        return 0;
    }
}

public sealed class MarkdownToDocx
{
    private readonly Body _body;
    private readonly MainDocumentPart _mainPart;
    private readonly WordprocessingDocument _doc;

    private MarkdownToDocx(WordprocessingDocument doc, MainDocumentPart mainPart, Body body)
    {
        _doc = doc;
        _mainPart = mainPart;
        _body = body;
    }

    public static WordprocessingDocument Convert(string markdown, string? title, string? author)
    {
        var doc = WordprocessingDocument.Create(Stream.Null, WordprocessingDocumentType.Document);
        // We'll save later, so we need a real path. Use a temp approach: save to memory then write.
        // Simpler: caller passes outputPath. Restructure:
        throw new InvalidOperationException("Use Convert with output path");
    }

    public static void ConvertToFile(string markdown, string outputPath, string? title, string? author)
    {
        using var doc = WordprocessingDocument.Create(outputPath, WordprocessingDocumentType.Document);
        var mainPart = doc.AddMainDocumentPart();
        mainPart.Document = new Document(new Body());
        var body = mainPart.Document.Body!;
        var converter = new MarkdownToDocx(doc, mainPart, body);
        converter.AddStyles();
        if (!string.IsNullOrEmpty(title))
        {
            converter.AddTitlePage(title, author);
        }
        converter.ParseMarkdown(markdown);
        converter.AddSectionProperties();
        mainPart.Document.Save();
    }

    private void AddStyles()
    {
        var stylesPart = _mainPart.AddNewPart<StyleDefinitionsPart>();
        var styles = new Styles();

        // Default run properties
        var defaultRPr = new StyleRunProperties(
            new RunFonts { Ascii = "Arial", HighAnsi = "Arial", ComplexScript = "Arial" },
            new FontSize { Val = "24" }, // 12pt
            new FontSizeComplexScript { Val = "24" });
        styles.Append(new Style(
            new StyleName { Val = "Normal" },
            new PrimaryStyle(),
            defaultRPr)
        { Type = StyleValues.Paragraph, StyleId = "Normal", Default = true });

        // Heading 1
        styles.Append(MakeHeadingStyle("Heading1", 1, 36, true)); // 18pt
        styles.Append(MakeHeadingStyle("Heading2", 2, 32, true)); // 16pt
        styles.Append(MakeHeadingStyle("Heading3", 3, 28, true)); // 14pt
        styles.Append(MakeHeadingStyle("Heading4", 4, 26, true)); // 13pt
        styles.Append(MakeHeadingStyle("Heading5", 5, 24, true)); // 12pt
        styles.Append(MakeHeadingStyle("Heading6", 6, 22, true)); // 11pt

        // Title style
        styles.Append(new Style(
            new StyleName { Val = "Title" },
            new BasedOn { Val = "Normal" },
            new NextParagraphStyle { Val = "Normal" },
            new PrimaryStyle(),
            new StyleParagraphProperties(
                new Justification { Val = JustificationValues.Center },
                new SpacingBetweenLines { After = "300" }),
            new StyleRunProperties(
                new RunFonts { Ascii = "Arial", HighAnsi = "Arial" },
                new Bold(),
                new FontSize { Val = "44" })) // 22pt
        { Type = StyleValues.Paragraph, StyleId = "Title" });

        // Quote
        styles.Append(new Style(
            new StyleName { Val = "Quote" },
            new BasedOn { Val = "Normal" },
            new NextParagraphStyle { Val = "Normal" },
            new PrimaryStyle(),
            new StyleParagraphProperties(
                new Indentation { Left = "720", Right = "720" },
                new SpacingBetweenLines { Before = "120", After = "120" }),
            new StyleRunProperties(
                new Italic(),
                new Color { Val = "555555" }))
        { Type = StyleValues.Paragraph, StyleId = "Quote" });

        // Code
        styles.Append(new Style(
            new StyleName { Val = "Code" },
            new BasedOn { Val = "Normal" },
            new NextParagraphStyle { Val = "Normal" },
            new PrimaryStyle(),
            new StyleRunProperties(
                new RunFonts { Ascii = "Consolas", HighAnsi = "Consolas", ComplexScript = "Consolas" },
                new FontSize { Val = "20" }))
        { Type = StyleValues.Paragraph, StyleId = "Code" });

        stylesPart.Styles = styles;
        stylesPart.Styles.Save();
    }

    private static Style MakeHeadingStyle(string id, int level, int sizeHalfPoints, bool bold)
    {
        var rPr = new StyleRunProperties(
            new RunFonts { Ascii = "Arial", HighAnsi = "Arial", ComplexScript = "Arial" },
            new FontSize { Val = sizeHalfPoints.ToString() },
            new FontSizeComplexScript { Val = sizeHalfPoints.ToString() });
        if (bold) rPr.Append(new Bold());

        return new Style(
            new StyleName { Val = $"heading {level}" },
            new BasedOn { Val = "Normal" },
            new NextParagraphStyle { Val = "Normal" },
            new PrimaryStyle(),
            new StyleParagraphProperties(
                new KeepNext(),
                new KeepLines(),
                new SpacingBetweenLines { Before = "240", After = "120" },
                new OutlineLevel { Val = level - 1 }),
            rPr)
        { Type = StyleValues.Paragraph, StyleId = id };
    }

    private void AddTitlePage(string title, string? author)
    {
        _body.Append(new Paragraph(
            new ParagraphProperties(new ParagraphStyleId { Val = "Title" }),
            new Run(new Text(title))));
        if (!string.IsNullOrEmpty(author))
        {
            _body.Append(new Paragraph(
                new ParagraphProperties(new ParagraphStyleId { Val = "Subtitle" }),
                new Run(new Text(author))));
        }
        // Page break
        _body.Append(new Paragraph(new Run(new Break { Type = BreakValues.Page })));
    }

    private void AddSectionProperties()
    {
        var sectPr = new SectionProperties();
        sectPr.Append(new PageSize { Width = 11906, Height = 16838 }); // A4
        sectPr.Append(new PageMargin { Top = 1440, Bottom = 1440, Left = 1440, Right = 1440, Header = 720, Footer = 720 });
        // RTL section
        sectPr.Append(new SectionPropertiesChange());
        _body.Append(sectPr);
    }

    private void ParseMarkdown(string md)
    {
        var lines = md.Split('\n');
        int i = 0;
        while (i < lines.Length)
        {
            var line = lines[i].TrimEnd('\r');

            // Skip empty lines
            if (string.IsNullOrWhiteSpace(line))
            {
                i++;
                continue;
            }

            // Horizontal rule
            if (line.Trim() == "---" || line.Trim() == "***" || line.Trim() == "___")
            {
                _body.Append(new Paragraph(new Run(new Break { Type = BreakValues.Page })));
                i++;
                continue;
            }

            // Heading
            var headingMatch = Regex.Match(line, @"^(#{1,6})\s+(.*)$");
            if (headingMatch.Success)
            {
                var level = headingMatch.Groups[1].Value.Length;
                var text = headingMatch.Groups[2].Value.Trim();
                _body.Append(MakeHeading(level, text));
                i++;
                continue;
            }

            // Table (starts with |)
            if (line.StartsWith("|") && i + 1 < lines.Length && lines[i + 1].TrimStart().StartsWith("|"))
            {
                var (table, consumed) = ParseTable(lines, i);
                _body.Append(table);
                i += consumed;
                continue;
            }

            // Code block
            if (line.StartsWith("```"))
            {
                var (codePara, consumed) = ParseCodeBlock(lines, i);
                _body.Append(codePara);
                i += consumed;
                continue;
            }

            // Blockquote
            if (line.StartsWith(">"))
            {
                var (quote, consumed) = ParseBlockquote(lines, i);
                _body.Append(quote);
                i += consumed;
                continue;
            }

            // List
            if (Regex.IsMatch(line, @"^[\-\*]\s+") || Regex.IsMatch(line, @"^\d+\.\s+"))
            {
                var (list, consumed) = ParseList(lines, i);
                foreach (var item in list) _body.Append(item);
                i += consumed;
                continue;
            }

            // Regular paragraph (collect consecutive non-empty lines)
            var paragraphLines = new List<string> { line };
            i++;
            while (i < lines.Length && !string.IsNullOrWhiteSpace(lines[i]) &&
                   !IsBlockStart(lines[i].TrimEnd('\r')))
            {
                paragraphLines.Add(lines[i].TrimEnd('\r'));
                i++;
            }
            _body.Append(MakeParagraph(string.Join(" ", paragraphLines)));
        }
    }

    private static bool IsBlockStart(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return true;
        if (line.StartsWith("#")) return true;
        if (line.StartsWith("|")) return true;
        if (line.StartsWith(">")) return true;
        if (line.StartsWith("```")) return true;
        if (line.Trim() == "---" || line.Trim() == "***" || line.Trim() == "___") return true;
        if (Regex.IsMatch(line, @"^[\-\*]\s+") || Regex.IsMatch(line, @"^\d+\.\s+")) return true;
        return false;
    }

    private Paragraph MakeHeading(int level, string text)
    {
        var p = new Paragraph();
        p.Append(new ParagraphProperties(
            new ParagraphStyleId { Val = $"Heading{level}" },
            new Justification { Val = JustificationValues.Right }));
        AppendInlineRuns(p, text);
        return p;
    }

    private Paragraph MakeParagraph(string text)
    {
        var p = new Paragraph();
        p.Append(new ParagraphProperties(
            new Justification { Val = JustificationValues.Right },
            new BiDi()));
        AppendInlineRuns(p, text);
        return p;
    }

    private void AppendInlineRuns(Paragraph p, string text)
    {
        // Parse inline markdown: **bold**, *italic*, `code`, [text](url)
        var i = 0;
        var buffer = new StringBuilder();
        var runs = new List<(string text, bool bold, bool italic, bool code)>();

        while (i < text.Length)
        {
            if (i + 1 < text.Length && text[i] == '*' && text[i + 1] == '*')
            {
                if (buffer.Length > 0) { runs.Add((buffer.ToString(), false, false, false)); buffer.Clear(); }
                var end = text.IndexOf("**", i + 2);
                if (end < 0) { buffer.Append(text[i]); i++; continue; }
                var inner = text.Substring(i + 2, end - i - 2);
                runs.Add((inner, true, false, false));
                i = end + 2;
            }
            else if (text[i] == '*')
            {
                if (buffer.Length > 0) { runs.Add((buffer.ToString(), false, false, false)); buffer.Clear(); }
                var end = text.IndexOf('*', i + 1);
                if (end < 0) { buffer.Append(text[i]); i++; continue; }
                var inner = text.Substring(i + 1, end - i - 1);
                runs.Add((inner, false, true, false));
                i = end + 1;
            }
            else if (text[i] == '`')
            {
                if (buffer.Length > 0) { runs.Add((buffer.ToString(), false, false, false)); buffer.Clear(); }
                var end = text.IndexOf('`', i + 1);
                if (end < 0) { buffer.Append(text[i]); i++; continue; }
                var inner = text.Substring(i + 1, end - i - 1);
                runs.Add((inner, false, false, true));
                i = end + 1;
            }
            else
            {
                buffer.Append(text[i]);
                i++;
            }
        }
        if (buffer.Length > 0) runs.Add((buffer.ToString(), false, false, false));

        foreach (var (text_, bold, italic, code) in runs)
        {
            var rPr = new RunProperties();
            if (bold) rPr.Append(new Bold());
            if (italic) rPr.Append(new Italic());
            if (code) rPr.Append(new RunStyle { Val = "Code" });
            rPr.Append(new RunFonts { Ascii = code ? "Consolas" : "Arial", HighAnsi = code ? "Consolas" : "Arial", ComplexScript = "Arial" });
            rPr.Append(new RightToLeftText());

            var run = new Run();
            run.Append(rPr);
            run.Append(new Text(text_) { Space = SpaceProcessingModeValues.Preserve });
            p.Append(run);
        }
    }

    private (Table table, int consumed) ParseTable(string[] lines, int start)
    {
        var rows = new List<string[]>();
        int i = start;
        while (i < lines.Length && lines[i].TrimStart().StartsWith("|"))
        {
            var cells = lines[i].Trim().Trim('|').Split('|').Select(c => c.Trim()).ToArray();
            rows.Add(cells);
            i++;
        }
        if (rows.Count < 2) return (MakeSimpleTable(rows), i - start);

        // Skip separator row (row 1: |---|---|)
        var headerRow = rows[0];
        var dataRows = rows.Skip(2).ToList();

        var table = new Table();
        var tblPr = new TableProperties(
            new TableBorders(
                new TopBorder { Val = BorderValues.Single, Size = 4, Color = "000000" },
                new BottomBorder { Val = BorderValues.Single, Size = 4, Color = "000000" },
                new LeftBorder { Val = BorderValues.Single, Size = 4, Color = "000000" },
                new RightBorder { Val = BorderValues.Single, Size = 4, Color = "000000" },
                new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new InsideVerticalBorder { Val = BorderValues.Single, Size = 4, Color = "999999" }),
            new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct },
            new TableLook { Val = "04A0" });
        table.Append(tblPr);

        var grid = new TableGrid();
        int colCount = headerRow.Length;
        int colWidth = 9000 / Math.Max(colCount, 1);
        for (int c = 0; c < colCount; c++) grid.Append(new GridColumn { Width = colWidth.ToString() });
        table.Append(grid);

        // Header row
        table.Append(MakeTableRow(headerRow, isHeader: true));
        // Data rows
        foreach (var row in dataRows)
        {
            // Normalize: pad to header length
            var cells = new string[colCount];
            for (int c = 0; c < colCount; c++) cells[c] = c < row.Length ? row[c] : "";
            table.Append(MakeTableRow(cells, isHeader: false));
        }

        return (table, i - start);
    }

    private Table MakeSimpleTable(List<string[]> rows)
    {
        var table = new Table();
        table.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }));
        foreach (var row in rows) table.Append(MakeTableRow(row, isHeader: false));
        return table;
    }

    private TableRow MakeTableRow(string[] cells, bool isHeader)
    {
        var tr = new TableRow();
        if (isHeader) tr.Append(new TableRowProperties(new TableHeader()));
        foreach (var cell in cells)
        {
            var tc = new TableCell();
            tc.Append(new TableCellProperties(
                new TableCellWidth { Width = "0", Type = TableWidthUnitValues.Auto }));
            var p = new Paragraph();
            p.Append(new ParagraphProperties(
                new Justification { Val = JustificationValues.Right },
                new BiDi()));
            var rPr = new RunProperties(
                new RunFonts { Ascii = "Arial", HighAnsi = "Arial", ComplexScript = "Arial" },
                new RightToLeftText());
            if (isHeader) rPr.Append(new Bold());
            p.Append(new Run(rPr, new Text(cell) { Space = SpaceProcessingModeValues.Preserve }));
            tc.Append(p);
            tr.Append(tc);
        }
        return tr;
    }

    private (Paragraph paragraph, int consumed) ParseCodeBlock(string[] lines, int start)
    {
        var sb = new StringBuilder();
        int i = start + 1;
        while (i < lines.Length && !lines[i].TrimStart().StartsWith("```"))
        {
            sb.AppendLine(lines[i].TrimEnd('\r'));
            i++;
        }
        var p = new Paragraph();
        p.Append(new ParagraphProperties(
            new ParagraphStyleId { Val = "Code" },
            new Justification { Val = JustificationValues.Left }));
        p.Append(new Run(new Text(sb.ToString()) { Space = SpaceProcessingModeValues.Preserve }));
        return (p, i - start + 1);
    }

    private (Paragraph paragraph, int consumed) ParseBlockquote(string[] lines, int start)
    {
        var sb = new StringBuilder();
        int i = start;
        while (i < lines.Length && lines[i].TrimStart().StartsWith(">"))
        {
            var text = lines[i].TrimStart().TrimStart('>').TrimStart();
            sb.AppendLine(text);
            i++;
        }
        var p = new Paragraph();
        p.Append(new ParagraphProperties(
            new ParagraphStyleId { Val = "Quote" },
            new Justification { Val = JustificationValues.Right },
            new BiDi()));
        AppendInlineRuns(p, sb.ToString().Trim());
        return (p, i - start);
    }

    private (List<Paragraph> paragraphs, int consumed) ParseList(string[] lines, int start)
    {
        var items = new List<Paragraph>();
        int i = start;
        bool ordered = Regex.IsMatch(lines[i], @"^\d+\.\s+");
        int index = 1;
        while (i < lines.Length)
        {
            var line = lines[i].TrimEnd('\r');
            if (string.IsNullOrWhiteSpace(line)) break;
            var match = Regex.Match(line, @"^([\-\*]|\d+\.)\s+(.*)$");
            if (!match.Success) break;
            var marker = ordered ? $"{index}." : "•";
            var text = match.Groups[2].Value;
            var p = new Paragraph();
            p.Append(new ParagraphProperties(
                new Indentation { Left = "360" },
                new Justification { Val = JustificationValues.Right },
                new BiDi()));
            // Add bullet/number
            var rPr1 = new RunProperties(
                new RunFonts { Ascii = "Arial", HighAnsi = "Arial", ComplexScript = "Arial" },
                new RightToLeftText());
            p.Append(new Run(rPr1, new Text($"{marker}  ") { Space = SpaceProcessingModeValues.Preserve }));
            AppendInlineRuns(p, text);
            items.Add(p);
            i++;
            index++;
        }
        return (items, i - start);
    }
}

public static class DocumentExtensions
{
    public static void SaveAs(this WordprocessingDocument doc, string outputPath)
    {
        // The doc is already created with the output path, just need to dispose
        // (File is already written)
    }
}
