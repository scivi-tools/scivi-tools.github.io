
/**
 * The ShapeList class provides methods to handle list of shapes.
 */
class ShapeList
{
    /**
     * ShapeList constructor.
     *
     * @param div - div the list box instance should be appended to.
     * @param onShapeSwitchCallback - callback that is triggered when the selected shape is changed.
     * @param onShapeToggledCallback - callback that is triggered when the visibility of shape is changed.
     */
    constructor(div, onShapeSwitchCallback, onShapeToggledCallback)
    {
        this.div = div;
        this.selectedItem = null;
        this.onShapeSwitched = onShapeSwitchCallback;
        this.onShapeToggled = onShapeToggledCallback;
    }

    /**
     * Add shape to the list. The newly added shape will be automatically selected.
     *
     * @param shape - shape to add.
     */
    addShape(shape)
    {
        let item = document.createElement("div");
        item.classList.add("listbox-item");
        item.classList.add("listbox-item-selected");
        item.shape = shape;

        item.addEventListener("click", (e) => {
            let clickedItem = e.target;
            while (clickedItem && !clickedItem.classList.contains("listbox-item"))
                clickedItem = clickedItem.parentElement;
            this.selectItem(clickedItem);
        });

        let title = document.createElement("div");
        title.classList.add("listbox-item-title")
        title.innerText = shape.name;

        let marker = document.createElement("div");
        marker.classList.add("listbox-item-marker");
        marker.style.background = `hsl(${shape.color[0]}, ${shape.color[1]}%, ${shape.color[2]}%)`;

        let visibility = document.createElement("div");
        visibility.classList.add("listbox-item-visibility")
        visibility.addEventListener("click", (e) => {
            e.stopPropagation();
            let clickedVisibility = e.target;
            let clickedItem = clickedVisibility.parentElement;
            clickedItem.shape.visible = !clickedItem.shape.visible;
            clickedVisibility.classList.toggle("listbox-item-visibility-off");
            this.onShapeToggled();
        });
        if (!shape.visible)
            visibility.classList.add("listbox-item-visibility-off");

        item.appendChild(marker);
        item.appendChild(visibility);
        item.appendChild(title);
        item.titleElem = title;
        this.div.appendChild(item);

        if (this.selectedItem)
            this.selectedItem.classList.remove("listbox-item-selected");
        this.selectedItem = item;
    }

    /**
     * Remove shape from the list.
     *
     * @param index - index of the shape to remove.
     */
    removeShape(index)
    {
        this.shape(index).wipe();
        this.div.removeChild(this.div.children[index]);
    }

    /**
     * Get number of shapes in the list.
     *
     * @return number of shapes.
     */
    shapesCount()
    {
        return this.div.children.length;
    }

    /**
     * Get shape by index.
     *
     * @param index - index of the shape.
     * @return shape for the given index.
     */
    shape(index)
    {
        return this.div.children[index].shape;
    }

    /**
     * Get selected shape.
     *
     * @return selected shape.
     */
    selectedShape()
    {
        return this.selectedItem.shape;
    }

    /**
     * Get index of the selected shape.
     *
     * @return index of the selected shape.
     */
    selectedShapeIndex()
    {
        for (let i = 0, n = this.shapesCount(), ss = this.selectedShape(); i < n; ++i) {
            if (this.shape(i) === ss)
                return i;
        }
        return null;
    }

    /**
     * Rename shape at index.
     *
     * @param index - index of the shape to remove.
     * @param name - new name of the shape.
     */
    renameShape(index, name)
    {
        let item = this.div.children[index];
        item.shape.name = name;
        item.titleElem.innerText = name;
    }

    /**
     * Select shape at given index.
     *
     * @param index - index of shape to select.
     */
    selectShape(index)
    {
        this.selectItem(this.div.children[index]);
    }

    /**
     * Select item.
     *
     * @param item - item to select.
     */
    selectItem(item)
    {
        if (item && item != this.selectedItem) {
            this.selectedItem.classList.remove("listbox-item-selected");
            item.classList.add("listbox-item-selected");
            this.selectedItem = item;
            this.onShapeSwitched();
        }
    }

    /**
     * Serialize the list of shapes.
     *
     * @return array of dictionaries describing the shapes.
     */
    serialize()
    {
        let result = [];
        for (let i = 0, n = this.shapesCount(); i < n; ++i)
            result.push(this.shape(i).serialize());
        return result;
    }

    /**
     * Deserializre the list of shapes.
     *
     * @param arr - array of dictionaries describing the shapes.
     */
    deserialize(arr)
    {
        while (this.shapesCount() > 0)
            this.removeShape(0);
        for (let i = 0, n = arr.length; i < n; ++i) {
            let shape = new Shape();
            shape.deserialize(arr[i]);
            this.addShape(shape);
        }
    }
}
