import PDFDict from 'src/core/objects/PDFDict';
import PDFString from 'src/core/objects/PDFString';
import PDFHexString from 'src/core/objects/PDFHexString';
import PDFName from 'src/core/objects/PDFName';
import PDFObject from 'src/core/objects/PDFObject';
import PDFNumber from 'src/core/objects/PDFNumber';
import PDFArray from 'src/core/objects/PDFArray';
import PDFRef from 'src/core/objects/PDFRef';

class PDFAcroField {
  readonly dict: PDFDict;

  protected constructor(dict: PDFDict) {
    this.dict = dict;
  }

  T(): PDFString | PDFHexString | undefined {
    return this.dict.lookupMaybe(PDFName.of('T'), PDFString, PDFHexString);
  }

  Ff(): PDFNumber | undefined {
    const numberOrRef = this.getInheritableAttribute(PDFName.of('Ff'));
    return this.dict.context.lookupMaybe(numberOrRef, PDFNumber);
  }

  V(): PDFObject | undefined {
    const valueOrRef = this.getInheritableAttribute(PDFName.of('V'));
    return this.dict.context.lookup(valueOrRef);
  }

  Kids(): PDFArray | undefined {
    return this.dict.lookupMaybe(PDFName.of('Kids'), PDFArray);
  }

  Parent(): PDFDict | undefined {
    return this.dict.lookupMaybe(PDFName.of('Parent'), PDFDict);
  }

  getParent(): PDFAcroField | undefined {
    const parent = this.Parent();
    if (!parent) return undefined;
    // return PDFAcroField.fromDict(parent);
    return new PDFAcroField(parent);
  }

  setParent(parent: PDFRef | undefined) {
    if (!parent) this.dict.delete(PDFName.of('Parent'));
    else this.dict.set(PDFName.of('Parent'), parent);
  }

  getFullyQualifiedName(): string | undefined {
    const parent = this.getParent();
    if (!parent) return this.getPartialName();
    return `${parent.getFullyQualifiedName()}.${this.getPartialName()}`;
  }

  getPartialName(): string | undefined {
    return this.T()?.decodeText();
  }

  setPartialName(partialName: string | undefined) {
    if (!partialName) this.dict.delete(PDFName.of('T'));
    else this.dict.set(PDFName.of('T'), PDFHexString.fromText(partialName));
  }

  getFlags(): number {
    return this.Ff()?.asNumber() ?? 0;
  }

  setFlags(flags: number) {
    this.dict.set(PDFName.of('Ff'), PDFNumber.of(flags));
  }

  hasFlag(flag: number): boolean {
    const flags = this.getFlags();
    return (flags & flag) !== 0;
  }

  setFlag(flag: number) {
    const flags = this.getFlags();
    this.setFlags(flags | flag);
  }

  clearFlag(flag: number) {
    const flags = this.getFlags();
    this.setFlags(flags & ~flag);
  }

  setFlagTo(flag: number, enable: boolean) {
    if (enable) this.setFlag(flag);
    else this.clearFlag(flag);
  }

  getInheritableAttribute(name: PDFName): PDFObject | undefined {
    let attribute: PDFObject | undefined;
    this.ascend((node) => {
      if (!attribute) attribute = node.dict.get(name);
    });
    return attribute;
  }

  ascend(visitor: (node: PDFAcroField) => any): void {
    visitor(this);
    const parent = this.getParent();
    if (parent) parent.ascend(visitor);
  }

  // TODO: If this field is itself a widget (because it was only rendered
  // once in the document so the field and widget properties were merged)
  // should we add itself to the `Kids` array? Should we try to split apart
  // the widget properties and create a separate object for it?
  normalizedEntries() {
    let Kids = this.Kids();

    if (!Kids) {
      Kids = this.dict.context.obj([]);
      this.dict.set(PDFName.of('Kids'), Kids);
    }

    return { Kids };
  }
}

export default PDFAcroField;